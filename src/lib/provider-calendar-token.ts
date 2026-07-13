import { createHmac } from "crypto";

export function signProviderCalendarToken(providerId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(providerId).digest("hex").slice(0, 32);
  return `${providerId}.${sig}`;
}

export function verifyProviderCalendarToken(token: string, secret: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const providerId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", secret).update(providerId).digest("hex").slice(0, 32);
  if (sig.length !== expected.length) return null;
  let ok = 0;
  for (let i = 0; i < sig.length; i++) ok |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return ok === 0 ? providerId : null;
}