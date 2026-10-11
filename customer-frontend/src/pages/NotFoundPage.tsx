import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Container } from '@/components/ui/section';
import { buttonStyles } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lavender-100 text-brand-700">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        This page has checked out
      </h1>
      <p className="mt-3 max-w-md text-sm text-ink-soft">
        The page you’re looking for doesn’t exist or may have moved. Let’s get you back to planning your perfect
        stay.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className={buttonStyles('primary', 'lg')}>
          <Home className="h-4 w-4" aria-hidden="true" /> Back to home
        </Link>
        <Link to="/search" className={buttonStyles('outline', 'lg')}>
          Find rooms
        </Link>
      </div>
    </Container>
  );
}