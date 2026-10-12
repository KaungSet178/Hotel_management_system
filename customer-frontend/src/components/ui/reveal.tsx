import { createElement, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type RevealTag = 'div' | 'section' | 'article' | 'figure' | 'li' | 'span';

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Milliseconds to wait before this element animates in (used to stagger siblings). */
  delay?: number;
  /** How much of the element must be visible before revealing (0–1). */
  threshold?: number;
  /** Element to render as the wrapper. */
  as?: RevealTag;
  style?: CSSProperties;
}

/**
 * Fades and slides its children into view the first time they intersect the viewport.
 * Falls back to instantly visible when IntersectionObserver is unavailable, and is
 * fully disabled under `prefers-reduced-motion` (see index.css).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  threshold = 0.12,
  as = 'div',
  style,
}: RevealProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState<boolean>(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold]);

  return createElement(
    as,
    {
      ref: setNode,
      className: cn('reveal', visible && 'reveal-visible', className),
      style: { transitionDelay: `${delay}ms`, ...style },
    },
    children,
  );
}
