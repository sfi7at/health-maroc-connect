/**
 * Business analytics tracker.
 * Records named events (page views, searches, bookings) for the admin dashboard.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const k = "hl_sid";
  let s = window.sessionStorage.getItem(k);
  if (!s) {
    s = crypto.randomUUID();
    window.sessionStorage.setItem(k, s);
  }
  return s;
}

export async function track(
  event: string,
  properties: Record<string, unknown> = {},
  category?: string,
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_name: event,
      event_category: category ?? null,
      user_id: auth.user?.id ?? null,
      session_id: sessionId(),
      properties: properties as Json,
      url: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
  } catch {
    /* never break UX for analytics */
  }
}

export const trackPageView = (path?: string) =>
  track("page_view", { path: path ?? (typeof window !== "undefined" ? window.location.pathname : "") }, "navigation");

export const trackSearch = (query: string, resultCount: number) =>
  track("search", { query, resultCount }, "discovery");

export const trackAppointmentBooked = (providerId: string, category: string) =>
  track("appointment_booked", { providerId, category }, "conversion");

export const trackBloodRequest = (city: string, bloodGroup: string) =>
  track("blood_request_created", { city, bloodGroup }, "blood");

export const trackProviderView = (providerId: string, category: string) =>
  track("provider_view", { providerId, category }, "discovery");