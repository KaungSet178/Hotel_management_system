const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function cleanMessyBookings() {
  console.log('🧹 Starting Supabase database cleanup...');
  const today = '2026-10-13';

  // 1. Delete all junk test bookings (EXP-* and LUX-*)
  console.log('\n--- 1. Purging junk test bookings (EXP-* and LUX-*) ---');
  const { data: expBookings, error: expErr } = await supabase
    .from('bookings')
    .select('id, booking_reference')
    .like('booking_reference', 'EXP-%');
  if (expErr) console.error('Error fetching EXP bookings:', expErr);
  else console.log(`Found ${expBookings?.length || 0} EXP test bookings.`);

  if (expBookings && expBookings.length > 0) {
    const expIds = expBookings.map((b) => b.id);
    const { error: delExpErr } = await supabase.from('bookings').delete().in('id', expIds);
    if (delExpErr) console.error('Failed to delete EXP bookings:', delExpErr.message);
    else console.log(`✓ Deleted ${expIds.length} EXP test bookings.`);
  }

  const { data: luxBookings, error: luxErr } = await supabase
    .from('bookings')
    .select('id, booking_reference')
    .like('booking_reference', 'LUX-%');
  if (luxErr) console.error('Error fetching LUX bookings:', luxErr);
  else console.log(`Found ${luxBookings?.length || 0} LUX test bookings.`);

  if (luxBookings && luxBookings.length > 0) {
    const luxIds = luxBookings.map((b) => b.id);
    const { error: delLuxErr } = await supabase.from('bookings').delete().in('id', luxIds);
    if (delLuxErr) console.error('Failed to delete LUX bookings:', delLuxErr.message);
    else console.log(`✓ Deleted ${luxIds.length} LUX test bookings.`);
  }

  // 2. Fix future booking erroneously marked CHECKED_IN
  console.log('\n--- 2. Correcting premature CHECKED_IN bookings ---');
  const { data: futureInstay, error: fErr } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, check_in_date, booking_status')
    .eq('booking_status', 'CHECKED_IN')
    .gt('check_in_date', today);

  if (fErr) console.error('Error checking future in-stay:', fErr);
  else if (futureInstay && futureInstay.length > 0) {
    for (const b of futureInstay) {
      console.log(`Fixing future booking ${b.booking_reference} (${b.guest_name}) -> CONFIRMED`);
      await supabase
        .from('bookings')
        .update({ booking_status: 'CONFIRMED' })
        .eq('id', b.id);
    }
  } else {
    console.log('No premature future in-stay bookings found.');
  }

  // 3. Clean up overdue check-ins (check_in_date < today and still CONFIRMED or PENDING)
  console.log('\n--- 3. Handling overdue check-in reservations ---');
  const { data: overdueCheckin, error: ocErr } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, check_in_date, booking_status')
    .in('booking_status', ['CONFIRMED', 'PENDING'])
    .lt('check_in_date', today);

  if (ocErr) console.error('Error checking overdue arrivals:', ocErr);
  else if (overdueCheckin && overdueCheckin.length > 0) {
    for (const b of overdueCheckin) {
      console.log(`Overdue check-in: ${b.booking_reference} (${b.guest_name}, check_in: ${b.check_in_date}) -> CANCELLED (No show)`);
      await supabase
        .from('bookings')
        .update({
          booking_status: 'CANCELLED',
          special_notes: 'Auto-cancelled: Check-in date passed without arrival (No-show).'
        })
        .eq('id', b.id);
    }
  } else {
    console.log('No overdue check-in reservations found.');
  }

  // 4. Clean up overdue in-stay customers (check_out_date < today and still CHECKED_IN)
  console.log('\n--- 4. Handling overdue in-stay departures ---');
  const { data: overdueInstay, error: oiErr } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, check_out_date, booking_status')
    .eq('booking_status', 'CHECKED_IN')
    .lt('check_out_date', today);

  if (oiErr) console.error('Error checking overdue departures:', oiErr);
  else if (overdueInstay && overdueInstay.length > 0) {
    for (const b of overdueInstay) {
      console.log(`Overdue in-stay: ${b.booking_reference} (${b.guest_name}, check_out: ${b.check_out_date}) -> CHECKED_OUT`);
      await supabase
        .from('bookings')
        .update({
          booking_status: 'CHECKED_OUT',
          checked_out_at: new Date().toISOString()
        })
        .eq('id', b.id);
    }
  } else {
    console.log('No overdue in-stay departures found.');
  }

  // 5. Reconcile Rooms status with active in-house bookings
  console.log('\n--- 5. Synchronizing Room statuses ---');
  // Find all currently active checked-in bookings
  const { data: activeStays } = await supabase
    .from('bookings')
    .select('id, room_id, guest_name, booking_reference, check_in_date, check_out_date')
    .eq('booking_status', 'CHECKED_IN')
    .lte('check_in_date', today)
    .gte('check_out_date', today);

  const activeRoomIds = new Set((activeStays || []).map((b) => b.room_id).filter(Boolean));
  console.log(`Active in-house rooms count: ${activeRoomIds.size}`);
  for (const s of activeStays || []) {
    console.log(`  In-house: Room ${s.room_id} -> ${s.guest_name} (${s.booking_reference})`);
  }

  // Get all rooms
  const { data: allRooms } = await supabase.from('rooms').select('id, room_number, status');
  if (allRooms) {
    for (const r of allRooms) {
      if (activeRoomIds.has(r.id)) {
        if (r.status !== 'OCCUPIED') {
          console.log(`Setting room ${r.room_number} to OCCUPIED`);
          await supabase.from('rooms').update({ status: 'OCCUPIED' }).eq('id', r.id);
        }
      } else if (r.room_number === '302') {
        // Keep 302 in maintenance
        if (r.status !== 'MAINTENANCE') {
          await supabase.from('rooms').update({ status: 'MAINTENANCE' }).eq('id', r.id);
        }
      } else {
        // Room not currently occupied or in maintenance -> AVAILABLE
        if (r.status !== 'AVAILABLE') {
          console.log(`Setting room ${r.room_number} (${r.status}) -> AVAILABLE`);
          await supabase.from('rooms').update({ status: 'AVAILABLE' }).eq('id', r.id);
        }
      }
    }
  }

  // 6. Summary of current clean bookings
  console.log('\n--- 6. Cleaned Bookings Summary ---');
  const { data: remaining } = await supabase
    .from('bookings')
    .select('booking_reference, guest_name, check_in_date, check_out_date, booking_status, payment_status, payment_method, total_amount')
    .order('check_in_date', { ascending: true });

  console.log(`Total active clean bookings in database: ${remaining?.length || 0}`);
  console.table(remaining);

  console.log('\n✓ Supabase cleanup completed successfully!');
}

cleanMessyBookings().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
