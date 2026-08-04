import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ appointmentId: z.string().uuid() });

function base64Url(value: string | Uint8Array): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  return buffer.toString("base64url");
}

function normalizePrivateKey(raw: string): string {
  let value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  value = value.replace(/\\r/g, "").replace(/\\n/g, "\n").trim();
  if (value.includes("BEGIN PUBLIC KEY") || value.startsWith("ssh-rsa ")) {
    throw new Error("JAAS_PRIVATE_KEY contient une clé publique. Utilisez le fichier privé sans extension .pub.");
  }
  if (value.includes("BEGIN OPENSSH PRIVATE KEY")) {
    throw new Error("La clé est au format OpenSSH. Générez ou convertissez-la au format PEM/PKCS8 avant de l'enregistrer dans Lovable.");
  }
  if (!value.includes("BEGIN PRIVATE KEY") && !value.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("JAAS_PRIVATE_KEY doit contenir la clé privée PEM complète, avec les lignes BEGIN et END.");
  }
  return value;
}

async function signJaasToken(payload: Record<string, unknown>): Promise<string> {
  const appId = process.env.JAAS_APP_ID;
  const keyId = process.env.JAAS_KEY_ID;
  const privateKeyRaw = process.env.JAAS_PRIVATE_KEY;
  if (!appId || !keyId || !privateKeyRaw) throw new Error("La visioconférence sécurisée n'est pas encore configurée.");
  const privateKeyPem = normalizePrivateKey(privateKeyRaw);
  const header = { alg: "RS256", kid: keyId, typ: "JWT" };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const { createPrivateKey, sign } = await import("node:crypto");
  let signingKey;
  try {
    signingKey = createPrivateKey(privateKeyPem);
  } catch {
    throw new Error("Impossible de lire JAAS_PRIVATE_KEY. Téléchargez à nouveau la clé privée PEM depuis JaaS et copiez son contenu complet.");
  }
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), signingKey);
  return `${unsigned}.${base64Url(signature)}`;
}

export const getSecureVideoAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: appointment, error } = await supabase.from("appointments").select("id, patient_id, provider_id, consultation_type, status, scheduled_for, duration_minutes, video_room_id").eq("id", data.appointmentId).maybeSingle();
    if (error || !appointment) throw new Error("Rendez-vous introuvable.");
    if (appointment.consultation_type !== "video" || appointment.status !== "approved") throw new Error("Cette téléconsultation n'est pas disponible.");
    const { data: ownsProvider } = await supabase.rpc("owns_provider", { _user_id: userId, _provider_id: appointment.provider_id });
    const isPatient = appointment.patient_id === userId;
    if (!isPatient && !ownsProvider) throw new Error("Accès refusé.");

    const start = new Date(appointment.scheduled_for).getTime();
    const now = Date.now();
    const opensAt = start - 15 * 60_000;
    const closesAt = start + (appointment.duration_minutes + 30) * 60_000;
    if (now < opensAt || now > closesAt) throw new Error("La salle ouvre 15 minutes avant le rendez-vous et ferme 30 minutes après.");

    const appId = process.env.JAAS_APP_ID;
    if (!appId || !appointment.video_room_id) throw new Error("La salle vidéo n'est pas configurée.");
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const issuedAt = Math.floor(now / 1000);
    const token = await signJaasToken({
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: appointment.video_room_id,
      nbf: issuedAt - 30,
      exp: Math.min(Math.floor(closesAt / 1000), issuedAt + 60 * 60),
      moderator: !!ownsProvider,
      context: { user: { id: userId, name: profile?.full_name ?? (ownsProvider ? "Médecin" : "Patient"), moderator: !!ownsProvider } },
    });
    return { domain: "8x8.vc", appId, roomName: appointment.video_room_id, token };
  });
