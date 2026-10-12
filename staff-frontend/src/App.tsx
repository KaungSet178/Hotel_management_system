import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from '@/store';
import { ToastProvider } from '@/components/toast';
import { AuthProvider, ProtectedRoute, useAuth } from '@/auth';
import { LoginPage } from '@/auth/LoginPage';
import { AdminStoreProvider } from '@/admin/context/AdminStore';
import {
  AdminOverviewPage,
  AdminRoomsPage,
  AdminChannelsPage,
  AdminFinancesPage,
  AdminAuditPage,
} from '@/admin';
import { Shell } from '@/components/layout';
import {
  ReservationsPage,
  RoomAvailabilityPage,
  BookingRequestsPage,
  QrCheckInPage,
  GuestServicesPage,
  CheckOutPage,
} from '@/pages';

function IndexRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/reservations'} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppStoreProvider>
          <AdminStoreProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Authentication Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Unified Portal Shell (Admin & Staff) */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Shell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<IndexRedirect />} />

                  {/* Executive Management Suite (Admin Only) */}
                  <Route
                    path="admin"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <AdminOverviewPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/rooms"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <AdminRoomsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/channels"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <AdminChannelsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/finances"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <AdminFinancesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/audit"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <AdminAuditPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Front Desk & Operations (Staff Only - Admin Blocked) */}
                  <Route
                    path="reservations"
                    element={
                      <ProtectedRoute requiredRole="STAFF">
                        <ReservationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="availability"
                    element={
                      <ProtectedRoute requiredRole="STAFF">
                        <RoomAvailabilityPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="requests"
                    element={
                      <ProtectedRoute requiredRole="STAFF">
                        <BookingRequestsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="qr-checkin"
                    element={
                      <ProtectedRoute requiredRole="STAFF">
                        <QrCheckInPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="services"
                    element={
                      <ProtectedRoute requiredRole="STAFF">
                        <GuestServicesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="checkout"
                    element={
                      <ProtectedRoute requiredRole="STAFF">
                        <CheckOutPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<IndexRedirect />} />
              </Routes>
            </BrowserRouter>
          </AdminStoreProvider>
        </AppStoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
}