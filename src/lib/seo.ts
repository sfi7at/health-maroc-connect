export interface SeoMeta {
  title: string;
  description: string;
  image?: string;
  path?: string;
}

export function buildHead({ title, description, image, path }: SeoMeta) {
  const fullTitle = title.includes("HealthLink") ? title : `${title} — HealthLink Maroc`;
  const meta = [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }
  if (path) meta.push({ property: "og:url", content: path });
  return { meta };
}