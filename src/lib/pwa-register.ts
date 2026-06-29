// Guarded PWA registration. Refuses to register in dev, iframe, or Lovable preview hosts.
// Supports `?sw=off` kill switch.

const APP_SW_PATH = "/sw.js";

function isLovablePreviewHost(host: string): boolean {
  return (
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--")
  );
}

async function unregisterApp() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? "").endsWith(APP_SW_PATH))
      .map((r) => r.unregister()),
  );
}

export async function registerPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const url = new URL(window.location.href);

  const refuse =
    !import.meta.env.PROD ||
    window.top !== window.self ||
    isLovablePreviewHost(window.location.hostname) ||
    url.searchParams.get("sw") === "off";

  if (refuse) {
    await unregisterApp();
    return;
  }

  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch {
    // ignore — SW failure must not break the app
  }
}