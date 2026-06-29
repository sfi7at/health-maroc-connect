import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

const SYSTEM_PROMPT = `Tu es l'assistant santé de HealthLink Maroc.
- Tu réponds en français par défaut (ou dans la langue de la dernière question).
- Tu donnes des informations générales et orientes vers un professionnel de santé.
- Tu n'établis JAMAIS de diagnostic, ne prescris pas de médicaments, ne remplaces pas une consultation.
- En cas d'urgence (douleur thoracique, AVC, hémorragie, idées suicidaires…) tu réponds en priorité avec :
  « ⚠️ Composez immédiatement le 141 (SAMU) ou le 15 au Maroc. »
- Tu restes bienveillant, concis, et termines toujours par un rappel : « Cette réponse est informative et ne remplace pas un avis médical. »`;

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("Service IA indisponible : clé API manquante.");
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
        temperature: 0.4,
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
    return { reply };
  });