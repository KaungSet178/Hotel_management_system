/**
 * GRAND AZURE LUXURY HOTEL MANAGEMENT SYSTEM
 * Unified Frontend Logic: Realtime Subscriptions, Contactless QR, Staff Ops, and 24h Policy
 */

// ============================================================================
// APPLICATION STATE
// ============================================================================
const state = {
  rooms: [],
  bookings: [],
  serviceRequests: [],
  activeRoomNumber: '202',
  selectedCategory: 'TOWELS',
  serviceFilterStatus: 'ALL',
  audioAlertsEnabled: true,
  config: null
};

// ============================================================================
// WEB AUDIO SYNTHESIZER (No external mp3 assets needed)
// ============================================================================
function playNotificationChime(type = 'chime') {
  if (!state.audioAlertsEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'urgent') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } else {
      // Luxury crystal bell chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.16); // C6
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    }
  } catch (e) {
    // AudioContext blocked by user autoplay policy before interaction
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
function showToast(title, desc, type = 'normal') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'urgent' ? 'toast-urgent' : type === 'warning' ? 'toast-warning' : ''}`;
  toast.innerHTML = `
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${desc}</div>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ============================================================================
// REALTIME ENGINE SUBSCRIPTION (SSE / SUPABASE REALTIME BRIDGE)
// ============================================================================
function initRealtimeConnection() {
  const statusPill = document.getElementById('realtime-status-pill');
  const statusText = document.getElementById('engine-status-text');

  const evtSource = new EventSource('/api/live-events');

  evtSource.onopen = () => {
    if (statusText) statusText.textContent = 'Supabase Realtime Live';
    if (statusPill) statusPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  };

  evtSource.addEventListener('booking_created', (e) => {
    const booking = JSON.parse(e.data);
    state.bookings.unshift(booking);
    renderBookingsTable();
    updateStaffMetrics();
    updateQuickTokenPills();
    playNotificationChime('chime');
    showToast('New Reservation Received', `${booking.guest_name} booked Suite ${booking.room_number}`, 'normal');
  });

  evtSource.addEventListener('booking_checked_in', (e) => {
    const data = JSON.parse(e.data);
    const existing = state.bookings.find(b => b.id === data.id || b.booking_reference === data.booking_reference);
    if (existing) {
      existing.booking_status = 'CHECKED_IN';
      existing.checked_in_at = data.checked_in_at;
    }
    fetchRooms(); // refresh room occupied state
    renderBookingsTable();
    updateStaffMetrics();
    playNotificationChime('chime');
    showToast('Contactless Check-In', `${data.guest_name} checked in to Suite ${data.room_number}`, 'success');
  });

  evtSource.addEventListener('booking_cancelled', (e) => {
    const data = JSON.parse(e.data);
    const existing = state.bookings.find(b => b.id === data.id || b.booking_reference === data.booking_reference);
    if (existing) {
      existing.booking_status = 'CANCELLED';
    }
    fetchRooms();
    renderBookingsTable();
    updateStaffMetrics();
    showToast('24h Policy Cancellation', `Reservation ${data.booking_reference} auto-released.`, 'warning');
  });

  evtSource.addEventListener('room_updated', (e) => {
    const updatedRoom = JSON.parse(e.data);
    const idx = state.rooms.findIndex(r => r.id === updatedRoom.id);
    if (idx !== -1) {
      state.rooms[idx] = updatedRoom;
    }
    renderRoomsGrid();
    renderStaffRoomMatrix();
    updateStaffMetrics();
  });

  evtSource.addEventListener('service_request_created', (e) => {
    const req = JSON.parse(e.data);
    state.serviceRequests.unshift(req);
    renderStaffServiceFeed();
    renderRoomRequestsTimeline();
    updateStaffMetrics();
    const isUrgent = req.priority === 'URGENT';
    playNotificationChime(isUrgent ? 'urgent' : 'chime');
    showToast(
      isUrgent ? '🚨 URGENT Service Request' : '🛎️ New In-Room Request',
      `Suite ${req.room_number}: ${req.details}`,
      isUrgent ? 'urgent' : 'normal'
    );
  });

  evtSource.addEventListener('service_request_updated', (e) => {
    const req = JSON.parse(e.data);
    const idx = state.serviceRequests.findIndex(r => r.id === req.id);
    if (idx !== -1) {
      state.serviceRequests[idx] = req;
    }
    renderStaffServiceFeed();
    renderRoomRequestsTimeline();
    updateStaffMetrics();
  });

  evtSource.onerror = () => {
    if (statusText) statusText.textContent = 'Reconnecting Realtime...';
  };
}

// ============================================================================
// DATA FETCHING
// ============================================================================
// AUTHENTICATION & API REQUEST HELPER
// ============================================================================
function getAuthHeader() {
  const currentView = document.querySelector('.nav-tab.active')?.dataset.view || 'guest-booking';
  if (currentView === 'staff-dashboard') {
    return 'Bearer demo-token-receptionist';
  }
  if (currentView === 'admin-policy') {
    return 'Bearer demo-token-admin';
  }
  return 'Bearer demo-token-guest';
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Authorization': (options.headers && (options.headers.Authorization || options.headers.authorization)) || getAuthHeader()
  };
  return fetch(url, { ...options, headers });
}

// ============================================================================
// DATA FETCHING
// ============================================================================
async function fetchConfig() {
  try {
    const res = await apiFetch('/api/config');
    state.config = await res.json();
  } catch (err) {
    console.error('Config fetch failed:', err);
  }
}

async function fetchRooms() {
  try {
    const res = await apiFetch('/api/rooms');
    const json = await res.json();
    if (json.success) {
      state.rooms = json.data;
      renderRoomsGrid();
      renderStaffRoomMatrix();
      updateStaffMetrics();
    }
  } catch (err) {
    console.error('Failed to load rooms:', err);
  }
}

async function fetchBookings() {
  try {
    const res = await apiFetch('/api/bookings');
    const json = await res.json();
    if (json.success) {
      state.bookings = json.data;
      renderBookingsTable();
      updateQuickTokenPills();
      updateStaffMetrics();
    }
  } catch (err) {
    console.error('Failed to load bookings:', err);
  }
}

async function fetchServiceRequests() {
  try {
    const res = await apiFetch('/api/service-requests');
    const json = await res.json();
    if (json.success) {
      state.serviceRequests = json.data;
      renderStaffServiceFeed();
      renderRoomRequestsTimeline();
      updateStaffMetrics();
    }
  } catch (err) {
    console.error('Failed to load service requests:', err);
  }
}

// ============================================================================
// VIEW SWITCHER & NAVIGATION
// ============================================================================
function setupNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewPanels = document.querySelectorAll('.view-panel');

  function switchView(targetViewId) {
    navTabs.forEach(t => t.classList.toggle('active', t.dataset.view === targetViewId));
    viewPanels.forEach(p => p.classList.toggle('active', p.id === `view-${targetViewId}`));
    window.location.hash = targetViewId;
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchView(tab.dataset.view);
    });
  });

  // Handle URL hash routing
  function checkUrlHash() {
    const hash = window.location.hash.replace('#', '');
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      state.activeRoomNumber = roomParam;
      const select = document.getElementById('select-active-room');
      if (select) select.value = roomParam;
      updateConciergeHeader();
    }

    if (hash && document.getElementById(`view-${hash}`)) {
      switchView(hash);
    }
  }

  window.addEventListener('hashchange', checkUrlHash);
  checkUrlHash();

  // Sub-tabs in Staff Dashboard
  const subTabs = document.querySelectorAll('.sub-tab');
  const subContents = document.querySelectorAll('.staff-tab-content');

  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subTabs.forEach(t => t.classList.toggle('active', t === tab));
      subContents.forEach(c => c.classList.toggle('active', c.id === `subtab-${tab.dataset.subtab.replace('staff-', 'staff-')}`));
    });
  });
}

// ============================================================================
// VIEW 1: GUEST BOOKING & ROOMS
// ============================================================================
function renderRoomsGrid() {
  const container = document.getElementById('rooms-grid-container');
  const countTag = document.getElementById('available-rooms-count');
  if (!container) return;

  const categoryFilter = document.getElementById('filter-type')?.value || 'ALL';
  const filtered = state.rooms.filter(room => {
    if (categoryFilter === 'ALL') return true;
    return room.room_type.toLowerCase().includes(categoryFilter.toLowerCase());
  });

  const availableCount = state.rooms.filter(r => r.status === 'AVAILABLE').length;
  if (countTag) {
    countTag.textContent = `${availableCount} of ${state.rooms.length} Suites Available`;
  }

  container.innerHTML = filtered.map(room => {
    const isAvail = room.status === 'AVAILABLE';
    const statusClass = `status-${room.status.toLowerCase()}`;
    const amenities = Array.isArray(room.amenities) ? room.amenities : [];

    return `
      <div class="room-card" data-room-id="${room.id}">
        <div class="room-thumb-wrapper">
          <img src="${room.image_url}" alt="${room.room_type}" class="room-thumb" loading="lazy" />
          <span class="room-status-badge ${statusClass}">${room.status}</span>
          <span class="room-suite-num">SUITE ${room.room_number}</span>
        </div>
        <div class="room-body">
          <h3 class="room-title">${room.room_type}</h3>
          <p class="room-desc">${room.description || 'Exclusive luxury appointments with panoramic vistas.'}</p>
          <div class="amenities-list">
            ${amenities.slice(0, 4).map(a => `<span class="amenity-tag">${a}</span>`).join('')}
          </div>
          <div class="room-footer">
            <div class="room-price-box">
              <span class="price-val">$${Number(room.price_per_night).toFixed(0)}</span>
              <span class="price-unit">per night + tax</span>
            </div>
            <button class="btn btn-gold btn-book-trigger" data-room-id="${room.id}" ${!isAvail ? 'disabled' : ''}>
              ${isAvail ? 'Reserve Suite →' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach booking modal trigger listeners
  container.querySelectorAll('.btn-book-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const roomId = btn.dataset.roomId;
      openBookingModal(roomId);
    });
  });
}

function openBookingModal(roomId) {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) return;

  const modal = document.getElementById('booking-modal');
  document.getElementById('modal-room-name').textContent = `Suite ${room.room_number} - ${room.room_type}`;
  document.getElementById('modal-room-rate').textContent = `$${Number(room.price_per_night).toFixed(2)} / night`;
  document.getElementById('book-room-id').value = room.id;
  document.getElementById('book-price-per-night').value = room.price_per_night;

  // Calculate nights and summary
  calculateBookingSummary();

  modal.classList.remove('hidden');
}

function calculateBookingSummary() {
  const checkInInput = document.getElementById('filter-check-in');
  const checkOutInput = document.getElementById('filter-check-out');
  const nightsInput = document.getElementById('book-nights-count');
  const rate = Number(document.getElementById('book-price-per-night').value) || 280;

  let nights = 2;
  if (checkInInput?.value && checkOutInput?.value) {
    const diffTime = Math.abs(new Date(checkOutInput.value) - new Date(checkInInput.value));
    const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (calculatedNights > 0) nights = calculatedNights;
  }

  if (nightsInput) nightsInput.value = nights;
  const subtotal = rate * nights;
  const serviceFee = 45.00;
  const total = subtotal + serviceFee;

  document.getElementById('summary-nights').textContent = nights;
  document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;
}

function setupBookingForm() {
  const form = document.getElementById('booking-form');
  const modal = document.getElementById('booking-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('btn-cancel-modal');

  const hideModal = () => modal.classList.add('hidden');
  closeBtn?.addEventListener('click', hideModal);
  cancelBtn?.addEventListener('click', hideModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-confirm-reservation');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Securing Room (Row Lock)...';

    try {
      const roomId = document.getElementById('book-room-id').value;
      const guestName = document.getElementById('book-guest-name').value;
      const guestEmail = document.getElementById('book-guest-email').value;
      const guestPhone = document.getElementById('book-guest-phone').value;
      const paymentMethod = document.querySelector('input[name="payment-method-radio"]:checked')?.value || 'ONLINE';
      
      const checkInDate = document.getElementById('filter-check-in').value || new Date().toISOString().split('T')[0];
      const checkOutDate = document.getElementById('filter-check-out').value || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
      const totalAmount = parseFloat(document.getElementById('summary-total').textContent.replace('$', ''));

      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          total_amount: totalAmount,
          payment_method: paymentMethod
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Booking failed');
      }

      hideModal();
      openQrPassModal(json.data);
      form.reset();
    } catch (err) {
      alert(`Booking Error: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Generate QR Pass';
    }
  });
}

function openQrPassModal(bookingData) {
  const modal = document.getElementById('qr-pass-modal');
  document.getElementById('qr-pass-image').src = bookingData.qr_code_data_url;
  document.getElementById('qr-token-display').textContent = bookingData.qr_token;
  document.getElementById('pass-ref').textContent = bookingData.booking_reference;
  document.getElementById('pass-room').textContent = `Suite ${bookingData.room_number}`;
  document.getElementById('pass-payment').textContent = bookingData.payment_method === 'ONLINE' ? 'PAID' : 'PAY AT HOTEL (UNPAID)';
  document.getElementById('pass-status').textContent = 'CONFIRMED';

  const notice = document.getElementById('pass-cancellation-notice');
  if (bookingData.auto_cancel_at) {
    const deadline = new Date(bookingData.auto_cancel_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notice.innerHTML = `⚠️ <strong>24-Hour Policy Notice:</strong> Unpaid reservation expires in 24 hours (Deadline: ${deadline}). Auto-releases if unconfirmed.`;
    notice.classList.remove('hidden');
  } else {
    notice.classList.add('hidden');
  }

  modal.classList.remove('hidden');

  // "Use at Kiosk Now" action
  document.getElementById('btn-use-at-kiosk').onclick = () => {
    modal.classList.add('hidden');
    document.getElementById('nav-kiosk-checkin').click();
    document.getElementById('manual-qr-input').value = bookingData.qr_token;
    document.getElementById('btn-submit-checkin').click();
  };

  document.getElementById('qr-modal-close-btn').onclick = () => modal.classList.add('hidden');
  document.getElementById('btn-close-qr-modal').onclick = () => modal.classList.add('hidden');
}

// ============================================================================
// VIEW 2: CONTACTLESS QR CHECK-IN TERMINAL
// ============================================================================
function setupCheckInKiosk() {
  const tokenInput = document.getElementById('manual-qr-input');
  const verifyBtn = document.getElementById('btn-submit-checkin');
  const resultBox = document.getElementById('checkin-result-box');

  verifyBtn?.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      showToast('Token Required', 'Please enter or select a QR pass token.', 'warning');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying HMAC Signature...';

    try {
      const res = await apiFetch('/api/check-in/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Check-in validation failed');
      }

      // Display key pass
      resultBox.classList.remove('hidden');
      document.getElementById('checkin-guest-name').textContent = `Welcome, ${json.data.guest_name}!`;
      document.getElementById('checkin-room-assigned').textContent = `Suite ${json.data.room_number} • Digital Key Activated`;
      document.getElementById('key-room-number').textContent = json.data.room_number;
      document.getElementById('key-booking-ref').textContent = json.data.booking_reference;
      document.getElementById('key-checkin-time').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Button to open in-room concierge
      document.getElementById('btn-open-room-concierge').onclick = () => {
        state.activeRoomNumber = json.data.room_number;
        const select = document.getElementById('select-active-room');
        if (select) select.value = json.data.room_number;
        updateConciergeHeader();
        document.getElementById('nav-in-room-portal').click();
      };

      playNotificationChime('chime');
      showToast('Key Activated', `Suite ${json.data.room_number} is ready for occupancy.`, 'success');
    } catch (err) {
      alert(`Check-In Failed: ${err.message}`);
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Check-In';
    }
  });
}

function updateQuickTokenPills() {
  const container = document.getElementById('quick-token-buttons');
  if (!container) return;

  const validTokens = state.bookings
    .filter(b => b.booking_status === 'CONFIRMED')
    .slice(0, 3);

  if (validTokens.length === 0) {
    container.innerHTML = '<span style="font-size:0.75rem; color:#64748B;">No un-checked-in bookings. Create one to test!</span>';
    return;
  }

  container.innerHTML = validTokens.map(b => `
    <button class="token-pill-btn" data-token="${b.qr_token}">
      ${b.guest_name} (Suite ${b.room_number})
    </button>
  `).join('');

  container.querySelectorAll('.token-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('manual-qr-input');
      if (input) input.value = btn.dataset.token;
      document.getElementById('btn-submit-checkin').click();
    });
  });
}

// ============================================================================
// VIEW 3: IN-ROOM SERVICE GUEST PORTAL
// ============================================================================
function setupInRoomPortal() {
  const catButtons = document.querySelectorAll('.cat-btn');
  const roomSelect = document.getElementById('select-active-room');
  const submitBtn = document.getElementById('btn-submit-service-req');

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCategory = btn.dataset.cat;
    });
  });

  roomSelect?.addEventListener('change', () => {
    state.activeRoomNumber = roomSelect.value;
    updateConciergeHeader();
    renderRoomRequestsTimeline();
  });

  submitBtn?.addEventListener('click', async () => {
    const details = document.getElementById('service-details').value.trim();
    const priority = document.getElementById('service-priority').value;

    if (!details) {
      showToast('Details Required', 'Please enter instructions for the staff.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Transmitting Request...';

    try {
      const res = await apiFetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: state.activeRoomNumber,
          category: state.selectedCategory,
          priority: priority,
          details: details
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit request');
      }

      document.getElementById('service-details').value = '';
      showToast('Request Sent', 'Our 24/7 staff has received your in-room request.', 'success');
    } catch (err) {
      alert(`Service Request Error: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Request to Staff →';
    }
  });

  updateConciergeHeader();
}

function updateConciergeHeader() {
  const badge = document.getElementById('concierge-room-badge');
  if (badge) badge.textContent = `SUITE ${state.activeRoomNumber}`;
}

function renderRoomRequestsTimeline() {
  const container = document.getElementById('room-requests-timeline');
  if (!container) return;

  const roomRequests = state.serviceRequests.filter(r => String(r.room_number) === String(state.activeRoomNumber));

  if (roomRequests.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #64748B; font-size: 0.85rem;">
        No active requests for Suite ${state.activeRoomNumber}. Choose a category to submit.
      </div>
    `;
    return;
  }

  container.innerHTML = roomRequests.map(r => `
    <div class="request-card ${r.priority === 'URGENT' ? 'urgent' : ''}">
      <div class="req-top-row">
        <span class="req-badge status-${r.status.toLowerCase()}">${r.status.replace('_', ' ')}</span>
        <span class="req-time-meta">${new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p class="req-details-text">${r.details}</p>
      <div class="req-time-meta">
        Category: <strong>${r.category}</strong> • Priority: <strong>${r.priority}</strong>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// VIEW 4: STAFF OPERATIONS DASHBOARD
// ============================================================================
function setupStaffDashboard() {
  const filterPills = document.querySelectorAll('.pill-btn');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.serviceFilterStatus = pill.dataset.filterStatus;
      renderStaffServiceFeed();
    });
  });

  const audioCheckbox = document.getElementById('audio-alert-checkbox');
  audioCheckbox?.addEventListener('change', () => {
    state.audioAlertsEnabled = audioCheckbox.checked;
  });
}

function updateStaffMetrics() {
  const totalRooms = state.rooms.length || 6;
  const occupiedRooms = state.rooms.filter(r => r.status === 'OCCUPIED').length;
  const occupancyPct = Math.round((occupiedRooms / totalRooms) * 100);

  const activeReqs = state.serviceRequests.filter(r => r.status !== 'COMPLETED');
  const urgentReqs = activeReqs.filter(r => r.priority === 'URGENT').length;

  const todayArrivals = state.bookings.filter(b => b.booking_status === 'CONFIRMED').length;
  const unpaidWatchlist = state.bookings.filter(b => b.payment_status === 'PENDING' && b.booking_status === 'CONFIRMED').length;

  const kpiOcc = document.getElementById('kpi-occupancy');
  const kpiOccSub = document.getElementById('kpi-occupied-rooms');
  const kpiActive = document.getElementById('kpi-service-active');
  const kpiUrgent = document.getElementById('kpi-urgent-count');
  const kpiArr = document.getElementById('kpi-arrivals');
  const kpiUnpaid = document.getElementById('kpi-unpaid-count');
  const badgeCounter = document.getElementById('active-requests-badge');
  const staffReqCounter = document.getElementById('staff-requests-count');

  if (kpiOcc) kpiOcc.textContent = `${occupancyPct}%`;
  if (kpiOccSub) kpiOccSub.textContent = `${occupiedRooms} of ${totalRooms} rooms occupied`;
  if (kpiActive) kpiActive.textContent = activeReqs.length;
  if (kpiUrgent) kpiUrgent.textContent = `${urgentReqs} urgent requests`;
  if (kpiArr) kpiArr.textContent = todayArrivals;
  if (kpiUnpaid) kpiUnpaid.textContent = unpaidWatchlist;
  if (badgeCounter) badgeCounter.textContent = activeReqs.length;
  if (staffReqCounter) staffReqCounter.textContent = activeReqs.length;
}

function renderStaffServiceFeed() {
  const feed = document.getElementById('staff-requests-feed');
  if (!feed) return;

  let filtered = state.serviceRequests;
  if (state.serviceFilterStatus !== 'ALL') {
    filtered = filtered.filter(r => r.status === state.serviceFilterStatus);
  }

  if (filtered.length === 0) {
    feed.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748B;">
        No service requests matching status: ${state.serviceFilterStatus}
      </div>
    `;
    return;
  }

  feed.innerHTML = filtered.map(req => {
    const isUrgent = req.priority === 'URGENT';
    const statusClass = `status-${req.status.toLowerCase()}`;

    return `
      <div class="staff-req-card ${isUrgent ? 'pulse-urgent' : ''}" data-req-id="${req.id}">
        <div class="staff-req-top">
          <div>
            <div class="staff-room-badge">SUITE ${req.room_number}</div>
            <div class="staff-guest-name">${req.guest_name}</div>
          </div>
          <span class="req-badge ${statusClass}">${req.status.replace('_', ' ')}</span>
        </div>
        <p class="staff-req-desc">
          <strong>[${req.category}]</strong> ${req.details}
        </p>
        <div class="req-time-meta" style="margin-bottom: 0.75rem;">
          Priority: <strong style="color: ${isUrgent ? '#F87171' : '#E2E8F0'}">${req.priority}</strong> • ${new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div class="staff-req-actions">
          ${req.status === 'PENDING' ? `
            <button class="btn btn-primary btn-block btn-action-step" data-id="${req.id}" data-next="IN_PROGRESS">
              Accept & In Progress →
            </button>
          ` : req.status === 'IN_PROGRESS' ? `
            <button class="btn btn-gold btn-block btn-action-step" data-id="${req.id}" data-next="COMPLETED">
              ✓ Mark Completed
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: #10B981; font-weight: 700; padding: 0.4rem 0;">✓ Fulfilled by Staff</span>
          `}
        </div>
      </div>
    `;
  }).join('');

  feed.querySelectorAll('.btn-action-step').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nextStatus = btn.dataset.next;
      await updateServiceRequestStatus(id, nextStatus);
    });
  });
}

async function updateServiceRequestStatus(id, status) {
  try {
    const res = await apiFetch(`/api/service-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Status update failed');
  } catch (err) {
    alert(err.message);
  }
}

function renderStaffRoomMatrix() {
  const container = document.getElementById('staff-rooms-matrix');
  if (!container) return;

  container.innerHTML = state.rooms.map(room => `
    <div class="matrix-room-card" data-room-id="${room.id}">
      <div class="matrix-header">
        <span class="matrix-num">Suite ${room.room_number}</span>
        <span class="req-badge status-${room.status.toLowerCase()}">${room.status}</span>
      </div>
      <div class="matrix-type">${room.room_type} (Floor ${room.floor})</div>
      <select class="luxury-select matrix-select-status" data-room-id="${room.id}">
        <option value="AVAILABLE" ${room.status === 'AVAILABLE' ? 'selected' : ''}>Available</option>
        <option value="OCCUPIED" ${room.status === 'OCCUPIED' ? 'selected' : ''}>Occupied</option>
        <option value="CLEANING" ${room.status === 'CLEANING' ? 'selected' : ''}>Cleaning</option>
        <option value="MAINTENANCE" ${room.status === 'MAINTENANCE' ? 'selected' : ''}>Maintenance</option>
      </select>
    </div>
  `).join('');

  container.querySelectorAll('.matrix-select-status').forEach(select => {
    select.addEventListener('change', async () => {
      const roomId = select.dataset.roomId;
      const newStatus = select.value;
      try {
        await apiFetch(`/api/rooms/${roomId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        showToast('Room Updated', `Suite status set to ${newStatus}`, 'normal');
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function renderBookingsTable() {
  const tbody = document.getElementById('staff-bookings-tbody');
  if (!tbody) return;

  if (state.bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748B;">No reservations recorded.</td></tr>';
    return;
  }

  tbody.innerHTML = state.bookings.map(b => {
    const isPayAtHotel = b.payment_method === 'PAY_AT_HOTEL';
    const isUnpaid = b.payment_status === 'PENDING';

    return `
      <tr>
        <td><strong>${b.booking_reference}</strong></td>
        <td>
          <div style="font-weight: 700; color: #FFFFFF;">${b.guest_name}</div>
          <div style="font-size: 0.725rem; color: #64748B;">${b.guest_email}</div>
        </td>
        <td>Suite ${b.room_number}</td>
        <td><span style="font-size: 0.8rem;">${b.check_in_date} → ${b.check_out_date}</span></td>
        <td>
          <span style="font-size: 0.75rem; font-weight: 700; color: ${b.payment_status === 'PAID' ? '#34D399' : '#FBBF24'}">
            ${b.payment_method} (${b.payment_status})
          </span>
          ${isPayAtHotel && isUnpaid && b.auto_cancel_at ? `
            <div style="font-size: 0.65rem; color: #F87171;">24h rule: ${new Date(b.auto_cancel_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
          ` : ''}
        </td>
        <td>
          <span class="req-badge status-${b.booking_status.toLowerCase()}">${b.booking_status}</span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm btn-view-pass" data-ref="${b.booking_reference}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">
            View QR
          </button>
        </td>
        <td>
          ${b.booking_status === 'CONFIRMED' ? `
            <button class="btn btn-gold btn-sm btn-action-checkin" data-token="${b.qr_token}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">
              Check-In
            </button>
          ` : b.booking_status === 'CHECKED_IN' ? `
            <button class="btn btn-outline btn-sm btn-action-checkout" data-id="${b.id}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">
              Check-Out
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: #64748B;">Archived</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-view-pass').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ref = btn.dataset.ref;
      const res = await apiFetch(`/api/bookings/${ref}`);
      const json = await res.json();
      if (json.success) openQrPassModal(json.data);
    });
  });

  tbody.querySelectorAll('.btn-action-checkin').forEach(btn => {
    btn.addEventListener('click', () => {
      const token = btn.dataset.token;
      document.getElementById('nav-kiosk-checkin').click();
      document.getElementById('manual-qr-input').value = token;
      document.getElementById('btn-submit-checkin').click();
    });
  });

  tbody.querySelectorAll('.btn-action-checkout').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Complete check-out? Suite will be automatically marked as CLEANING for Housekeeping.')) {
        await apiFetch(`/api/check-out/${id}`, { method: 'POST' });
        showToast('Guest Checked Out', 'Suite status routed to Housekeeping for cleaning.', 'normal');
      }
    });
  });
}

// ============================================================================
// VIEW 5: 24-HOUR CANCELLATION POLICY & ADMIN AUTOMATION
// ============================================================================
function setupAdminPolicy() {
  const triggerBtn = document.getElementById('btn-trigger-cancellation-job');
  const simulateBtn = document.getElementById('btn-simulate-expired');
  const feedbackBox = document.getElementById('job-status-feedback');
  const feedbackText = document.getElementById('job-status-text');

  triggerBtn?.addEventListener('click', async () => {
    triggerBtn.disabled = true;
    feedbackText.textContent = 'Executing 24-Hour Cancellation Policy stored procedure...';

    try {
      const res = await apiFetch('/api/jobs/trigger-cancellation', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        feedbackText.innerHTML = `✓ Worker Execution Complete: <strong>${json.data.cancelled_count}</strong> expired booking(s) auto-released.`;
        showToast('Background Job Completed', `${json.data.cancelled_count} expired Pay-at-Hotel booking(s) released.`, 'normal');
      }
    } catch (err) {
      feedbackText.textContent = `Execution failed: ${err.message}`;
    } finally {
      triggerBtn.disabled = false;
    }
  });

  simulateBtn?.addEventListener('click', async () => {
    simulateBtn.disabled = true;
    feedbackText.textContent = 'Creating simulated expired 24h Pay-at-Hotel booking & triggering worker...';

    try {
      const res = await apiFetch('/api/demo/simulate-expired-booking', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        feedbackText.innerHTML = `✓ Simulation Succeeded: Created booking <strong>${json.booking.booking_reference}</strong> with expired deadline and cancelled it via worker.`;
        showToast('Policy Enforced', `Auto-cancelled expired reservation ${json.booking.booking_reference}`, 'warning');
      }
    } catch (err) {
      feedbackText.textContent = `Simulation failed: ${err.message}`;
    } finally {
      simulateBtn.disabled = false;
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Set default dates
  const checkIn = document.getElementById('filter-check-in');
  const checkOut = document.getElementById('filter-check-out');
  if (checkIn && checkOut) {
    const today = new Date();
    const future = new Date(today.getTime() + 86400000 * 2);
    checkIn.value = today.toISOString().split('T')[0];
    checkOut.value = future.toISOString().split('T')[0];

    checkIn.addEventListener('change', calculateBookingSummary);
    checkOut.addEventListener('change', calculateBookingSummary);
  }

  // Setup components
  setupNavigation();
  setupBookingForm();
  setupCheckInKiosk();
  setupInRoomPortal();
  setupStaffDashboard();
  setupAdminPolicy();

  // Load Initial Data
  await fetchConfig();
  await Promise.all([
    fetchRooms(),
    fetchBookings(),
    fetchServiceRequests()
  ]);

  // Connect Realtime Stream
  initRealtimeConnection();
});
