import { Link } from 'react-router-dom';
import { BedDouble, Expand, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { ImageWithFallback } from '@/components/ui/image';
import { buttonStyles } from '@/components/ui/button';
import { formatMMK } from '@/lib/currency';
import { cn } from '@/lib/cn';
import type { RoomListing } from '@/services/types';

interface RoomListingCardProps {
  listing: RoomListing;
  queryString: string;
  nights: number;
}

export function RoomListingCard({ listing, queryString, nights }: RoomListingCardProps) {
  const { room, hotel, fromNightly, availability } = listing;
  const soldOut = !availability.available;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-brand-900/8 bg-white shadow-card transition-shadow',
        soldOut ? 'opacity-90' : 'hover:shadow-pop',
      )}
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative">
          <ImageWithFallback
            src={room.images[0]?.src ?? hotel.heroImage}
            alt={room.images[0]?.alt ?? room.name}
            seed={room.id}
            className="h-56 w-full object-cover md:h-full"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {room.tags.slice(0, 1).map((tag) => (
              <Badge key={tag} tone="lavender" className="shadow-sm">
                {tag}
              </Badge>
            ))}
            {!soldOut && availability.roomsLeft <= 3 ? (
              <Badge tone="amber" className="shadow-sm">
                {availability.roomsLeft} room{availability.roomsLeft === 1 ? '' : 's'} left
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
            <span className="font-medium uppercase tracking-wide text-brand-600">{room.wing}</span>
            <span aria-hidden="true">·</span>
            <span>{room.roomNumbers}</span>
          </div>

          <h3 className="mt-1.5 text-lg font-semibold text-ink">{room.name}</h3>
          <p className="mt-1 text-xs text-ink-mute">{hotel.name}</p>

          <div className="mt-2">
            <Rating value={room.rating} count={room.reviewCount} />
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{room.description}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> Max {room.maxGuests} guests
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {room.bedConfiguration}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Expand className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {room.areaSqm} m²
            </span>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
            <div>
              <p className="text-xs text-ink-mute">From</p>
              <p className="text-xl font-bold text-brand-800">{formatMMK(fromNightly)}</p>
              <p className="text-xs text-ink-mute">
                per night · {nights} night{nights === 1 ? '' : 's'} total prepaid incl. taxes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/rooms/${room.id}${queryString}`}
                className={buttonStyles('outline', 'sm')}
                aria-label={`View details for ${room.name}`}
              >
                View Details
              </Link>
              {soldOut ? (
                <span
                  className={cn(buttonStyles('secondary', 'sm'), 'cursor-not-allowed opacity-70')}
                  aria-disabled="true"
                >
                  Sold out
                </span>
              ) : (
                <Link
                  to={`/book/${room.id}${queryString}`}
                  className={buttonStyles('primary', 'sm')}
                  aria-label={`Select ${room.name}`}
                >
                  Select Room
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}