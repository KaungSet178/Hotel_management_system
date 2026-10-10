const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('Testing connection to Supabase project:', url);

  const supabase = createClient(url, key, {
    auth: { persistSession: false }
  });

  console.log('\n--- Checking Relational Tables ---');
  const tables = ['rooms', 'bookings', 'profiles', 'room_service_requests', 'audit_logs'];

  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' }).limit(5);
    if (error) {
      console.log(`[FAIL] Table '${table}': ${error.message} (code: ${error.code})`);
    } else {
      console.log(`[PASS] Table '${table}': Accessible (${count} rows found)`);
    }
  }

  console.log('\n--- Checking Stored Procedures (RPCs) ---');
  const { data: cancelData, error: cancelError } = await supabase.rpc('auto_cancel_unpaid_bookings');
  if (cancelError) {
    console.log(`[FAIL] RPC 'auto_cancel_unpaid_bookings': ${cancelError.message}`);
  } else {
    console.log(`[PASS] RPC 'auto_cancel_unpaid_bookings': Working! Result:`, cancelData);
  }

  // Check rooms catalog
  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id, room_number, room_type, status, price_per_night');
  if (rooms && rooms.length > 0) {
    console.log('\n--- Sample Rooms Seeded in Supabase ---');
    rooms.forEach(r => console.log(`Room ${r.room_number}: ${r.room_type} (${r.status}) - $${r.price_per_night}/night`));
  } else if (roomsError) {
    console.log('[INFO] Could not fetch rooms:', roomsError.message);
  }
}

testConnection().catch(err => {
  console.error('Test Connection Exception:', err);
});
