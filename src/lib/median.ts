/**
 * Median JavaScript Bridge helpers.
 * These calls are no-ops outside the Median native app wrapper.
 * Docs: https://median.co/docs/onesignal
 */

type MedianOneSignal = {
  login?: (opts: { externalId: string }) => void;
  logout?: () => void;
};

type MedianBridge = {
  onesignal?: MedianOneSignal;
};

declare global {
  // eslint-disable-next-line no-var
  var median: MedianBridge | undefined;
}

function getMedian(): MedianBridge | undefined {
  if (typeof window === "undefined") return undefined;
  const m = (window as unknown as { median?: MedianBridge }).median;
  if (typeof m === "undefined") return undefined;
  return m;
}

export function medianOneSignalLogin(email: string | null | undefined): void {
  if (!email) return;
  try {
    const m = getMedian();
    if (!m?.onesignal?.login) return;
    m.onesignal.login({ externalId: email });
  } catch (err) {
    console.warn("[median] onesignal.login failed", err);
  }
}

export function medianOneSignalLogout(): void {
  try {
    const m = getMedian();
    if (!m?.onesignal?.logout) return;
    m.onesignal.logout();
  } catch (err) {
    console.warn("[median] onesignal.logout failed", err);
  }
}