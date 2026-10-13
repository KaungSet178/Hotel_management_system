import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { SignInDialog } from '@/components/account/SignInDialog';
import { usingMockServices } from '@/services';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {usingMockServices ? (
        <div className="bg-brand-900 py-1.5 text-center text-xs font-medium text-brand-100">
          Demo mode — running on the mock service layer. No real payments are processed.
        </div>
      ) : null}
      <Header />
      <main className="flex-1">
        <div key={pathname} className="animate-page-in">
          <Outlet />
        </div>
      </main>
      <Footer />
      <SignInDialog />
    </div>
  );
}