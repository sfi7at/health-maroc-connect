import { supabase } from "@/integrations/supabase/client";

/** Build a stable per-browser device fingerprint (best-effort, non-cryptographic). */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(new Date().getTimezoneOffset()),
      navigator.hardwareConcurrency ?? "",
      // @ts-expect-error - deviceMemory is non-standard
      navigator.deviceMemory ?? "",
    ].join("|");
    const buf = new TextEncoder().encode(parts);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "unknown";
  }
}

/** Record a login attempt for brute-force analytics. Best-effort. */
export async function recordLoginAttempt(opts: {
  email?: string | null;
  success: boolean;
  userId?: string | null;
  failureReason?: string | null;
}) {
  try {
    await supabase.from("login_attempts").insert({
      email: opts.email ?? null,
      user_id: opts.userId ?? null,
      success: opts.success,
      failure_reason: opts.failureReason ?? null,
      user_agent: navigator.userAgent,
    } as never);
  } catch {
    /* ignore */
  }
}

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

/** Log a security event (auth, anomaly, fraud signal). Best-effort. */
export async function logSecurityEvent(
  eventType: string,
  severity: SecuritySeverity = "medium",
  metadata: Record<string, unknown> = {},
) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("security_events").insert({
      user_id: u.user?.id ?? null,
      event_type: eventType,
      severity,
      user_agent: navigator.userAgent,
      metadata: metadata as never,
    } as never);
  } catch {
    /* ignore */
  }
}

/** Register or refresh the current device for the signed-in user. */
export async function registerCurrentDevice() {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user?.id) return;
    const fp = await getDeviceFingerprint();
    await supabase
      .from("user_devices")
      .upsert(
        {
          user_id: u.user.id,
          fingerprint: fp,
          device_name: inferDeviceName(),
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,fingerprint" },
      );
  } catch {
    /* ignore */
  }
}

function inferDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "Navigateur";
}

/** Submit a user report against a target (provider, user, review, listing, content). */
export async function reportEntity(opts: {
  targetType: "provider" | "user" | "review" | "article" | "blood_request" | "other";
  targetId?: string | null;
  category: "fake_profile" | "wrong_info" | "fraud" | "spam" | "abuse" | "other";
  reason: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) throw new Error("Vous devez être connecté pour signaler.");
  const { error } = await supabase.from("reports").insert({
    reporter_id: u.user.id,
    target_type: opts.targetType,
    target_id: opts.targetId ?? null,
    category: opts.category,
    reason: opts.reason.trim().slice(0, 1000),
  } as never);
  if (error) throw error;
  await logSecurityEvent("user_report", "low", { targetType: opts.targetType, category: opts.category });
}

/** Trust level → human-readable French label + color token. */
export function trustBadgeMeta(level: string | null | undefined): { label: string; tone: "green" | "blue" | "amber" | "slate" } {
  switch (level) {
    case "official":
      return { label: "Vérifié officiel", tone: "blue" };
    case "verified":
      return { label: "Vérifié", tone: "green" };
    case "partial":
      return { label: "Partiellement vérifié", tone: "amber" };
    default:
      return { label: "Non vérifié", tone: "slate" };
  }
}

/** Validate Moroccan phone number formats: +212XXXXXXXXX, 0XXXXXXXXX. */
export function isValidMoroccanPhone(input: string): boolean {
  const v = input.replace(/\s|-/g, "");
  return /^(\+212|0)(5|6|7)\d{8}$/.test(v);
}

/** Password strength evaluator (0-4). */
export function passwordStrength(pwd: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hints: string[];
} {
  const hints: string[] = [];
  let score = 0;
  if (pwd.length >= 8) score++; else hints.push("Au moins 8 caractères");
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++; else hints.push("Majuscules et minuscules");
  if (/\d/.test(pwd)) score++; else hints.push("Au moins un chiffre");
  if (/[^A-Za-z0-9]/.test(pwd)) score++; else hints.push("Au moins un caractère spécial");
  const labels = ["Très faible", "Faible", "Moyen", "Fort", "Très fort"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score], hints };
}
