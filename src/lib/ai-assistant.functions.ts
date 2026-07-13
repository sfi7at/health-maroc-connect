import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ContextSchema = z.object({
  language: z.enum(["fr", "ar", "en"]).optional(),
  city: z.string().max(80).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  blood_group: z.string().max(8).optional(),
  favorites: z.array(z.string().max(120)).max(20).optional(),
  recent_searches: z.array(z.string().max(120)).max(20).optional(),
}).partial();

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: ContextSchema.optional(),
});

/** Keywords that flip the assistant into emergency mode. */
const EMERGENCY_PATTERNS = [
  /douleur (forte|aigu[eë]) (à|a) la poitrine|douleur thoracique|crise cardiaque|infarctus|heart attack/i,
  /accident vasculaire|avc|stroke|paralys/i,
  /h[ée]morragie|saigne(ment)? abondant|bleeding heavily/i,
  /suicid|me tuer|kill myself|harm myself/i,
  /perte de conscience|inconscien|unconscious|fainted/i,
  /difficult[eé] (à|a) respirer|can'?t breathe|étouff/i,
  /انتحار|نزيف|سكتة|ذبحة|اختناق/,
];

function detectEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((p) => p.test(text));
}

function buildSystemPrompt(ctx?: z.infer<typeof ContextSchema>): string {
  const lang = ctx?.language ?? "fr";
  const langName = lang === "ar" ? "arabe (darija acceptée)" : lang === "en" ? "anglais" : "français";
  const ctxLines: string[] = [];
  if (ctx?.city) ctxLines.push(`- Ville actuelle de l'utilisateur : ${ctx.city}`);
  if (ctx?.latitude && ctx?.longitude)
    ctxLines.push(`- Position GPS : ${ctx.latitude.toFixed(3)}, ${ctx.longitude.toFixed(3)}`);
  if (ctx?.blood_group) ctxLines.push(`- Groupe sanguin : ${ctx.blood_group}`);
  if (ctx?.favorites?.length) ctxLines.push(`- Favoris santé : ${ctx.favorites.join(", ")}`);
  if (ctx?.recent_searches?.length) ctxLines.push(`- Recherches récentes : ${ctx.recent_searches.join(", ")}`);

  return `Tu es l'assistant santé contextuel de Vytalma — la super-app santé du Maroc.

RÈGLES ABSOLUES
- Réponds en ${langName}.
- Tu ne poses JAMAIS de diagnostic, tu ne prescris JAMAIS de médicament ni de dosage.
- Tu n'es pas un remplacement médical — oriente toujours vers un professionnel.
- En cas d'urgence vitale, ta PREMIÈRE phrase doit être : « ⚠️ Urgence — composez immédiatement le 141 (SAMU) ou le 15 au Maroc. »
- Reste bref (≤ 6 phrases), bienveillant, factuel.
- Termine par : « Cette réponse est informative et ne remplace pas un avis médical. »

CONTEXTE UTILISATEUR
${ctxLines.length ? ctxLines.join("\n") : "- Aucun contexte fourni."}

COMPÉTENCES
- Comprendre un symptôme, une situation, une question administrative santé.
- Orienter vers : médecin/spécialiste, pharmacie de garde, hôpital d'urgence, laboratoire, centre de don de sang.
- Suggérer une action concrète dans l'app (ex : « Cherche un dermatologue à Rabat »).
- Si l'utilisateur cherche un soignant : nomme la spécialité et la ville.

FORMAT DE RÉPONSE
1. Brève explication humaine.
2. Action suggérée (1 phrase).
3. Numéros utiles si pertinent (141 SAMU, 15, 19 Police, 150 Protection civile).
4. Rappel de consultation médicale.`;
}

export interface AssistantSuggestion {
  label: string;
  to: string;
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("Service IA indisponible : clé API manquante.");
    }
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const emergency = detectEmergency(lastUser);
    const ctx = data.context;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt(ctx) },
          ...data.messages,
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Trop de requêtes. Veuillez réessayer dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés. Réessayez plus tard.");
      throw new Error(`Erreur IA (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("Réponse vide du modèle IA.");

    // Heuristic action suggestions based on user query keywords.
    const suggestions = buildSuggestions(lastUser, ctx);

    return { reply, emergency, suggestions };
  });

function buildSuggestions(
  text: string,
  ctx?: z.infer<typeof ContextSchema>,
): AssistantSuggestion[] {
  const t = text.toLowerCase();
  const out: AssistantSuggestion[] = [];
  const cityQ = ctx?.city ? `&city=${encodeURIComponent(ctx.city)}` : "";

  if (/pharmac/.test(t) && /(garde|nuit|ouverte|24)/.test(t)) {
    out.push({ label: "Pharmacies de garde proches", to: "/pharmacies/on-duty" });
  } else if (/pharmac/.test(t)) {
    out.push({ label: "Trouver une pharmacie", to: `/pharmacies/search?q=${encodeURIComponent(text)}${cityQ}` });
  }
  if (/dermatolog|cardiolog|gyneco|gynéco|pediatr|pédiatre|ophtalm|dentiste|orl|psychiatr|m[eé]decin|docteur/.test(t)) {
    out.push({ label: "Trouver un médecin", to: `/doctors/search?q=${encodeURIComponent(text)}${cityQ}` });
  }
  if (/h[oô]pital|clinique|urgence/.test(t)) {
    out.push({ label: "Hôpitaux & urgences", to: "/hospitals/emergency" });
  }
  if (/laboratoire|analyse|test sanguin|prise de sang/.test(t)) {
    out.push({ label: "Laboratoires", to: "/laboratories" });
  }
  if (/sang|don(?:ner)?|donor|blood/.test(t)) {
    out.push({ label: "Don de sang", to: "/blood" });
  }
  if (/rendez-?vous|appointment|consultation/.test(t)) {
    out.push({ label: "Mes rendez-vous", to: "/appointments" });
  }
  // Always offer global search as fallback
  if (out.length === 0) {
    out.push({ label: "Rechercher dans Vytalma", to: `/search?q=${encodeURIComponent(text)}` });
  }
  return out.slice(0, 4);
}