import { useEffect, useRef } from 'react';

/** Attaches an IntersectionObserver to the returned ref; fires onIntersect once when visible. */
export function useInfiniteScroll(onIntersect: () => void, enabled: boolean) {
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !targetRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { rootMargin: '200px' }
    );
    observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return targetRef;
}
