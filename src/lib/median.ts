/**
 * Median JavaScript Bridge helpers.
 * These calls are no-ops outside the Median native app wrapper.
 * Docs: https://median.co/docs/onesignal
 */

type MedianOneSignal = {
  login?: (externalId: string) => void;
  logout?: () => void;
  externalUserId?: {
    set?: (opts: { externalId: string }) => void;
    remove?: () => void;
  };
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

export function medianOneSignalLogin(externalId: string | null | undefined): void {
  if (!externalId) return;
  try {
    const m = getMedian();
    if (!m?.onesignal) return;
    if (m.onesignal.login) {
      m.onesignal.login(externalId);
      return;
    }
    m.onesignal.externalUserId?.set?.({ externalId });
  } catch (err) {
    console.warn("[median] onesignal.login failed", err);
  }
}

export function medianOneSignalLogout(): void {
  try {
    const m = getMedian();
    if (!m?.onesignal) return;
    if (m.onesignal.logout) {
      m.onesignal.logout();
      return;
    }
    m.onesignal.externalUserId?.remove?.();
  } catch (err) {
    console.warn("[median] onesignal.logout failed", err);
  }
}