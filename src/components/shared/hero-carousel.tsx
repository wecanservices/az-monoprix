"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Slide {
  src: string;
  href: string;
  alt: string;
}

/**
 * Auto-rotating hero carousel. SVG-only banners so it stays fast and
 * looks crisp at any DPR. Snap-scroll on mobile, dots indicator premium.
 */
export function HeroCarousel({
  slides,
  intervalMs = 5000,
}: {
  slides: Slide[];
  intervalMs?: number;
}) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setActive((a) => (a + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const child = el.children[active] as HTMLElement | undefined;
    if (child) {
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" });
    }
  }, [active]);

  return (
    <section
      className="relative"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
      onTouchEnd={() => (pausedRef.current = false)}
    >
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[28px] shadow-[var(--shadow-elev-3)]"
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          if (idx !== active) setActive(idx);
        }}
      >
        {slides.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            className="snap-start shrink-0 w-full block relative overflow-hidden rounded-[28px] group"
            style={{ aspectRatio: "800 / 320" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-[700ms] motion-safe:ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
              loading={i === 0 ? "eager" : "lazy"}
            />
            {/* Subtle inner ring for polish */}
            <span className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-[rgb(0_0_0/0.06)]" />
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-[rgb(0_0_0/0.28)] backdrop-blur-md px-2 py-1.5 border border-[rgb(255_255_255/0.15)] shadow-[0_4px_12px_-2px_rgb(0_0_0/0.35)]">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out-expo)]",
                  i === active
                    ? "w-8 bg-white shadow-[0_0_8px_0_rgb(255_255_255/0.7)]"
                    : "w-1.5 bg-[rgb(255_255_255/0.55)] hover:bg-[rgb(255_255_255/0.85)]",
                )}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
