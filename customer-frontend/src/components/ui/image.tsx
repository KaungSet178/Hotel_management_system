import { useState } from 'react';
import { Hotel } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Image with a graceful two-step fallback: Unsplash → picsum (stable per seed)
 * → branded gradient placeholder. Guarantees the UI never shows a broken image.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  seed,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  seed?: string;
  sizes?: string;
}) {
  const [stage, setStage] = useState<'primary' | 'fallback' | 'placeholder'>('primary');
  const [failedSrc, setFailedSrc] = useState(src);

  const resolved =
    stage === 'primary'
      ? failedSrc
      : stage === 'fallback'
        ? `https://picsum.photos/seed/${encodeURIComponent(seed ?? alt)}/1200/800`
        : '';

  if (stage === 'placeholder' || !resolved) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-brand-100 via-lavender-100 to-brand-200 text-brand-600',
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <Hotel className="h-8 w-8 opacity-60" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (stage === 'primary') {
          setFailedSrc(src);
          setStage('fallback');
        } else {
          setStage('placeholder');
        }
      }}
    />
  );
}