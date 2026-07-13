/** Helpers to build JSON-LD payloads for SEO-rich pages. */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "Vytalma",
    url: "https://health-maroc-connect.lovable.app",
    logo: "https://health-maroc-connect.lovable.app/icon-512.png",
    areaServed: { "@type": "Country", name: "Morocco" },
  };
}

export function physicianLd(p: {
  name: string;
  specialty?: string;
  address?: string;
  city?: string;
  phone?: string;
  url: string;
  rating?: number;
  reviewCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: p.name,
    medicalSpecialty: p.specialty,
    telephone: p.phone,
    url: p.url,
    address: p.address
      ? { "@type": "PostalAddress", streetAddress: p.address, addressLocality: p.city, addressCountry: "MA" }
      : undefined,
    aggregateRating:
      p.rating && p.reviewCount
        ? { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount }
        : undefined,
  };
}

export function pharmacyLd(p: {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  url: string;
  openNow?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Pharmacy",
    name: p.name,
    telephone: p.phone,
    url: p.url,
    address: p.address
      ? { "@type": "PostalAddress", streetAddress: p.address, addressLocality: p.city, addressCountry: "MA" }
      : undefined,
    openingHours: p.openNow ? "Mo-Su 00:00-23:59" : undefined,
  };
}

export function breadcrumbsLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}