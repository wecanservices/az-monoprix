"use client";

import { useEffect, useRef } from "react";

/**
 * Streams the driver's geolocation to /api/v1/driver/location while
 * mounted. Mount inside a mission-in-progress screen — unmount
 * automatically stops the watcher.
 */
export function GpsTracker({ enabled }: { enabled: boolean }) {
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        // Throttle: 1 ping every 8s.
        if (now - lastSent.current < 8000) return;
        lastSent.current = now;
        try {
          await fetch("/api/v1/driver/location", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
              accuracy: pos.coords.accuracy,
            }),
          });
        } catch {
          /* offline — retry on next tick */
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return null;
}
