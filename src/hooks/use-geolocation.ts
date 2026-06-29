import { useCallback, useEffect, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export type GeoStatus = "idle" | "prompt" | "granted" | "denied" | "unavailable" | "loading";

const STORAGE_KEY = "hl_geo_last";

export function useGeolocation(autoRequest = false) {
  const [position, setPosition] = useState<GeoPosition | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as GeoPosition) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next: GeoPosition = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        setPosition(next);
        setStatus("granted");
        setError(null);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!autoRequest) return;
    if (typeof navigator === "undefined" || !navigator.permissions) {
      request();
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((res) => {
        if (res.state === "granted") request();
        else setStatus(res.state as GeoStatus);
      })
      .catch(() => request());
  }, [autoRequest, request]);

  return { position, status, error, request, setPosition };
}