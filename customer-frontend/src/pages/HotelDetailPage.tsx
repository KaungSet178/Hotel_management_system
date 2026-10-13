import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock, MapPin, Phone } from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui/section';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { Card } from '@/components/ui/card';
import { Gallery } from '@/components/hotel/Gallery';
import { RoomListingCard } from '@/components/hotel/RoomListingCard';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { buttonStyles } from '@/components/ui/button';
import { useAsync } from '@/hooks/useAsync';
import { useStayQuery } from '@/hooks/useStayQuery';
import { hotels } from '@/services';

export function HotelDetailPage() {
  const { hotelId = '' } = useParams();
  const stay = useStayQuery();

  const hotelQuery = useAsync(() => hotels.getHotel(hotelId).then((r) => r.data), [hotelId]);
  const roomsQuery = useAsync(
    () =>
      hotels
        .listHotelRooms({
          hotelId,
          stay: { checkIn: stay.checkIn, checkOut: stay.checkOut },
          adults: stay.adults,
          rooms: stay.rooms,
        })
        .then((r) => r.data),
    [hotelId, stay.checkIn, stay.checkOut, stay.adults, stay.rooms],
  );

  if (hotelQuery.loading) {
    return (
      <Container className="py-16">
        <LoadingState label="Loading hotel…" />
      </Container>
    );
  }

  if (hotelQuery.error || !hotelQuery.data) {
    return (
      <Container className="py-16">
        <ErrorState
          title="We couldn't load this hotel"
          description={hotelQuery.error ?? 'The hotel may no longer be listed.'}
          onRetry={hotelQuery.reload}
        />
      </Container>
    );
  }

  const hotel = hotelQuery.data;

  return (
    <Container className="py-8">
      <Link
        to={`/search${stay.queryString}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to search results
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Gallery images={hotel.gallery} />
        </div>
        <div>
          <Badge tone="lavender">{hotel.address.city}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{hotel.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{hotel.tagline}</p>
          <div className="mt-3">
            <Rating value={hotel.rating} count={hotel.reviewCount} size="md" />
          </div>

          <p className="mt-5 text-sm text-ink-soft">{hotel.description}</p>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
              <dd className="text-ink-soft">
                {hotel.address.line1}
                {hotel.address.line2 ? `, ${hotel.address.line2}` : ''}, {hotel.address.city},{' '}
                {hotel.address.country}
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
              <dd className="text-ink-soft">
                Check-in {hotel.checkInTime} · Check-out {hotel.checkOutTime}
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
              <dd className="text-ink-soft">{hotel.hotline} · 24/7 concierge</dd>
            </div>
          </dl>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Facilities &amp; amenities</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hotel.facilities.map((facility) => (
                <li key={facility} className="flex items-center gap-2 text-sm text-ink-soft">
                  <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  {facility}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <SectionHeading
          title="Available room types"
          description="Live availability for your selected dates. Select a room to continue booking."
          action={
            <Link to={`/search${stay.queryString}`} className={buttonStyles('outline', 'sm')}>
              Change dates
            </Link>
          }
        />
        <div className="mt-6">
          {roomsQuery.loading ? (
            <LoadingState label="Checking availability…" />
          ) : roomsQuery.error ? (
            <ErrorState description={roomsQuery.error} onRetry={roomsQuery.reload} />
          ) : (
            <div className="space-y-4">
              {(roomsQuery.data ?? []).map((listing) => (
                <RoomListingCard
                  key={listing.room.id}
                  listing={listing}
                  queryString={stay.queryString}
                  nights={stay.nights}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Card className="mt-10 p-6 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Booking directly with StayEase</p>
        <p className="mt-1">
          Best rate guaranteed, instant confirmation and secure folio protection. Every direct booking is
          eligible for Smart QR Express Check-in.
        </p>
      </Card>
    </Container>
  );
}