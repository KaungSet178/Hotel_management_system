import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from '@/store';
import { ToastProvider } from '@/components/toast';
import { Shell } from '@/components/layout';
import {
  ReservationsPage,
  RoomAvailabilityPage,
  BookingRequestsPage,
  QrCheckInPage,
  GuestServicesPage,
  CheckOutPage,
} from '@/pages';

export default function App() {
  return (
    <ToastProvider>
      <AppStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/reservations" replace />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="availability" element={<RoomAvailabilityPage />} />
              <Route path="requests" element={<BookingRequestsPage />} />
              <Route path="qr-checkin" element={<QrCheckInPage />} />
              <Route path="services" element={<GuestServicesPage />} />
              <Route path="checkout" element={<CheckOutPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/reservations" replace />} />
          </Routes>
        </BrowserRouter>
      </AppStoreProvider>
    </ToastProvider>
  );
}