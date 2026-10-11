import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { Layout } from '@/components/layout/Layout';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { SearchResultsPage } from '@/pages/SearchResultsPage';
import { HotelDetailPage } from '@/pages/HotelDetailPage';
import { RoomDetailPage } from '@/pages/RoomDetailPage';
import { BookPage } from '@/pages/BookPage';
import { ConfirmationPage } from '@/pages/ConfirmationPage';
import { MyBookingsPage } from '@/pages/MyBookingsPage';
import { AccountPage } from '@/pages/AccountPage';
import { ReservationDetailPage } from '@/pages/ReservationDetailPage';
import { GuestServicesPage } from '@/pages/GuestServicesPage';
import { GuestServicesEntryPage } from '@/pages/GuestServicesEntryPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <BookingProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchResultsPage />} />
              <Route path="hotels/:hotelId" element={<HotelDetailPage />} />
              <Route path="rooms/:roomId" element={<RoomDetailPage />} />
              <Route path="book/:roomId" element={<BookPage />} />
              <Route path="confirmation/:reference" element={<ConfirmationPage />} />
              <Route path="bookings" element={<MyBookingsPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="reservations/:reference" element={<ReservationDetailPage />} />
              <Route path="reservations/:reference/services" element={<GuestServicesPage />} />
              <Route path="guest-services" element={<GuestServicesEntryPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}