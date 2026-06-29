import { registerPushSubscription } from "@/lib/notifications.functions";

/**
 * Subscribe the browser to web push notifications and register the subscription server-side.
 * VAPID public key is read from VITE_VAPID_PUBLIC_KEY. If absent, we abort cleanly.
 */
export async function enableWebPush(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") return { ok: false, reason: "no_window" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const vapid = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
  if (!vapid) return { ok: false, reason: "missing_vapid" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }
  const json = sub.toJSON();
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return { ok: false, reason: "invalid_keys" };

  await registerPushSubscription({
    data: { endpoint, p256dh, auth_key: auth, user_agent: navigator.userAgent.slice(0, 500) },
  });
  return { ok: true };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}