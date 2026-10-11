import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  ConciergeBell,
  Expand,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  Wallet,
} from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui/section';
import { SearchForm } from '@/components/layout/SearchForm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { ImageWithFallback } from '@/components/ui/image';
import { buttonStyles } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useAsync } from '@/hooks/useAsync';
import { hotels } from '@/services';
import { formatMMK } from '@/lib/currency';
import { todayPlus } from '@/lib/dates';
import type { RoomListing } from '@/services/types';

const STATS = [
  { icon: Timer, value: '45 sec', label: 'Average QR check-in' },
  { icon: Sparkles, value: '99.4%', label: 'Guest satisfaction' },
  { icon: ShieldCheck, value: 'Instant', label: 'Folio lock guarantee' },
  { icon: Wallet, value: 'Zero', label: 'Hidden booking fees' },
];

const STANDARDS = [
  {
    icon: Timer,
    title: 'Zero Waiting Time',
    body: 'Skip the front desk queue completely. A secure digital QR pass is generated the moment your reservation is confirmed, granting keyless access straight from your phone.',
  },
  {
    icon: ConciergeBell,
    title: 'Bespoke Concierge',
    body: 'Order fresh organic linens, tailored housekeeping times or resort amenities in one tap. Requests route automatically to floor staff with sub-15 minute fulfilment tracking.',
  },
  {
    icon: Wallet,
    title: 'Clear Folio Control',
    body: 'Pay at Hotel for same-day or next-day arrivals, or pay securely online for any stays ahead — all in MMK with zero currency conversion markups or concealed charges.',
  },
];

export function HomePage() {
  const featured = useAsync(() => hotels.getFeaturedRooms(3).then((r) => r.data), []);

  const heroImage = featured.data?.[0]?.hotel?.heroImage;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {heroImage ? (
            <ImageWithFallback
              src={heroImage}
              alt=""
              seed="stayflow-hero"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-brand-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-950/85 via-brand-900/70 to-lavender-50" />
        </div>

        <Container className="relative pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-100">
              Smart hospitality redefined · Myanmar
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Effortless Stays, Seamless Hospitality
            </h1>
            <p className="mt-5 max-w-2xl text-base text-brand-50/90 sm:text-lg">
              Experience contactless check-in, bespoke comfort and immediate room confirmation across our
              boutique residences in Yangon &amp; Inle Lake.
            </p>
          </div>

          <div className="mt-9 max-w-5xl">
            <SearchForm />
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-lg font-bold text-white">{stat.value}</dt>
                  <dd className="text-xs text-brand-50/80">{stat.label}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Featured rooms */}
      <section className="pt-4 pb-16">
        <Container>
          <SectionHeading
            eyebrow="Curated sanctuaries"
            title="Featured Rooms &amp; Exclusive Suites"
            description="A handpicked selection of our most requested suites, live availability synchronised across every StayFlow residence."
            action={
              <Link to="/search" className={buttonStyles('outline', 'md', 'shrink-0')}>
                View all rooms
              </Link>
            }
          />

          <div className="mt-8">
            {featured.loading ? (
              <LoadingState label="Loading featured suites…" />
            ) : featured.error ? (
              <ErrorState description={featured.error} onRetry={featured.reload} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(featured.data ?? []).map((listing) => (
                  <FeaturedCard key={listing.room.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Operating standard */}
      <section className="bg-white py-16">
        <Container>
          <SectionHeading
            eyebrow="StayFlow operating standard"
            title="Hospitality Without Bottlenecks"
            description="Engineered for privacy, speed and discretion — powered by the StayFlow Smart Hospitality OS."
            align="center"
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STANDARDS.map((standard) => (
              <Card key={standard.title} className="h-full">
                <div className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <standard.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{standard.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{standard.body}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-10 bg-brand-900 text-white">
            <div className="grid gap-6 p-8 md:grid-cols-[auto_1fr] md:items-center">
              <div className="text-center md:text-left">
                <p className="text-4xl font-bold text-brand-100">99.4%</p>
                <p className="text-xs uppercase tracking-widest text-brand-200">Verified</p>
              </div>
              <blockquote className="text-sm text-brand-50/95 sm:text-base">
                “StayFlow has made our regular Yangon business travels so peaceful. Generating the QR code
                before my flight and walking straight to Room 402 without standing in a single reception
                line is unmatched luxury.”
                <footer className="mt-3 text-xs font-medium text-brand-200">
                  Daw Thiri Kyaw · Managing Director, Silkroute Capital
                </footer>
              </blockquote>
            </div>
          </Card>
        </Container>
      </section>
    </div>
  );
}

function FeaturedCard({ listing }: { listing: RoomListing }) {
  const { room, hotel, fromNightly } = listing;
  const nightRange = `${room.areaSqm} m²`;
  const defaultQuery = `?dest=${hotel.slug || hotel.id}&in=${todayPlus(7)}&out=${todayPlus(10)}&adults=2&rooms=1`;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link to={`/rooms/${room.id}${defaultQuery}`} className="relative block">
        <ImageWithFallback
          src={room.images[0]?.src ?? hotel.heroImage}
          alt={room.images[0]?.alt ?? room.name}
          seed={room.id}
          className="aspect-[4/3] w-full object-cover"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {room.tags.slice(0, 1).map((tag) => (
            <Badge key={tag} tone="lavender">
              {tag}
            </Badge>
          ))}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{hotel.name}</p>
        <h3 className="mt-1 text-lg font-semibold text-ink">{room.name}</h3>
        <div className="mt-2">
          <Rating value={room.rating} count={room.reviewCount} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {room.bedConfiguration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {room.maxGuests} guests
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Expand className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {nightRange}
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xs text-ink-mute">Nightly from</p>
            <p className="text-lg font-bold text-brand-800">{formatMMK(fromNightly)}</p>
          </div>
          <Link
            to={`/rooms/${room.id}${defaultQuery}`}
            className={buttonStyles('outline', 'sm')}
            aria-label={`Explore ${room.name}`}
          >
            Explore Room <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}