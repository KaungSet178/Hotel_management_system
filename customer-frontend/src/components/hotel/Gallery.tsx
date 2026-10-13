import { useState } from 'react';
import { ImageWithFallback } from '@/components/ui/image';
import { cn } from '@/lib/cn';
import type { HotelImage } from '@/types';

export function Gallery({ images, className }: { images: HotelImage[]; className?: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="group overflow-hidden rounded-2xl border border-brand-900/8 bg-white">
        <ImageWithFallback
          key={active}
          src={current.src}
          alt={current.alt}
          seed={`gallery-${active}`}
          className="aspect-[16/10] w-full animate-fade-in object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <li key={`${image.src}-${index}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}: ${image.alt}`}
                aria-current={index === active}
                className={cn(
                  'group overflow-hidden rounded-xl border-2 transition-colors',
                  index === active ? 'border-brand-600' : 'border-transparent hover:border-brand-300',
                )}
              >
                <ImageWithFallback
                  src={image.src}
                  alt={image.alt}
                  seed={`thumb-${index}`}
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}