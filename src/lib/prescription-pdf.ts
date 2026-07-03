import { jsPDF } from "jspdf";

export type PrescriptionHeader = {
  clinic_name?: string;
  doctor_name?: string;
  title?: string;
  specialty?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  inpe?: string;
  logo_url?: string;
};

export type PrescriptionItem = {
  medication: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
};

export type PrescriptionPayload = {
  header: PrescriptionHeader;
  patient: {
    name: string;
    age?: number | null;
    gender?: string | null;
    weight_kg?: number | null;
    allergies?: string | null;
  };
  diagnosis?: string | null;
  items: PrescriptionItem[];
  notes?: string | null;
  prescribed_at: string; // yyyy-mm-dd
  verification_url?: string | null;
  city?: string | null;
};

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePrescriptionPdf(p: PrescriptionPayload): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;

  // Header band
  doc.setFillColor(14, 159, 110);
  doc.rect(0, 0, pageW, 6, "F");

  let x = M;
  let y = M;

  // Logo
  if (p.header.logo_url) {
    const dataUrl = await loadImageAsDataUrl(p.header.logo_url);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "PNG", M, y, 64, 64, undefined, "FAST");
        x = M + 80;
      } catch { /* ignore */ }
    }
  }

  // Doctor block
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(p.header.doctor_name ?? "Dr.", x, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta: string[] = [];
  if (p.header.title) meta.push(p.header.title);
  if (p.header.specialty) meta.push(p.header.specialty);
  if (meta.length) doc.text(meta.join(" · "), x, y + 34);
  if (p.header.clinic_name) doc.text(p.header.clinic_name, x, y + 48);

  // Right-aligned contact
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const right: string[] = [];
  if (p.header.address) right.push(p.header.address);
  if (p.header.phone) right.push("Tél : " + p.header.phone);
  if (p.header.email) right.push(p.header.email);
  if (p.header.website) right.push(p.header.website);
  if (p.header.inpe) right.push("INPE : " + p.header.inpe);
  right.forEach((line, i) => {
    doc.text(line, pageW - M, y + 12 + i * 12, { align: "right" });
  });

  // Separator
  y = y + 82;
  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, pageW - M, y);

  // Date & city
  y += 20;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  const date = new Date(p.prescribed_at + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(`${p.city ?? ""}${p.city ? ", le " : "Le "}${date}`, pageW - M, y, { align: "right" });

  // Patient block
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Patient", M, y);
  doc.setFont("helvetica", "normal");
  const patientBits: string[] = [p.patient.name];
  if (p.patient.age) patientBits.push(`${p.patient.age} ans`);
  if (p.patient.gender) patientBits.push(p.patient.gender);
  if (p.patient.weight_kg) patientBits.push(`${p.patient.weight_kg} kg`);
  y += 16;
  doc.text(patientBits.join(" · "), M, y);
  if (p.patient.allergies) {
    y += 14;
    doc.setTextColor(180, 30, 30);
    doc.text("Allergies : " + p.patient.allergies, M, y);
    doc.setTextColor(20, 20, 20);
  }

  if (p.diagnosis) {
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.text("Diagnostic", M, y);
    doc.setFont("helvetica", "normal");
    y += 14;
    const lines = doc.splitTextToSize(p.diagnosis, pageW - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 12;
  }

  // Rx heading
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(14, 159, 110);
  doc.text("Rx", M, y);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);

  y += 8;
  p.items.forEach((item, i) => {
    if (y > pageH - 140) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${item.medication}${item.form ? ` — ${item.form}` : ""}`, M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const sub: string[] = [];
    if (item.dosage) sub.push("Posologie : " + item.dosage);
    if (item.frequency) sub.push("Fréquence : " + item.frequency);
    if (item.duration) sub.push("Durée : " + item.duration);
    if (sub.length) {
      const lines = doc.splitTextToSize(sub.join("   ·   "), pageW - 2 * M - 14);
      doc.text(lines, M + 14, y);
      y += lines.length * 12;
    }
    if (item.notes) {
      const lines = doc.splitTextToSize("Note : " + item.notes, pageW - 2 * M - 14);
      doc.setTextColor(90, 90, 90);
      doc.text(lines, M + 14, y);
      doc.setTextColor(20, 20, 20);
      y += lines.length * 12;
    }
    doc.setFontSize(11);
    y += 8;
  });

  if (p.notes) {
    if (y > pageH - 140) { doc.addPage(); y = M; }
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Recommandations", M, y);
    doc.setFont("helvetica", "normal");
    y += 14;
    const lines = doc.splitTextToSize(p.notes, pageW - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 12;
  }

  // Signature area
  const sigY = pageH - 130;
  doc.setDrawColor(180, 180, 180);
  doc.line(pageW - M - 200, sigY, pageW - M, sigY);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("Signature & cachet", pageW - M, sigY + 12, { align: "right" });

  // Footer
  doc.setDrawColor(230, 230, 230);
  doc.line(M, pageH - 60, pageW - M, pageH - 60);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Ordonnance générée via HealthLink Maroc — healthlink.ma", M, pageH - 42);
  if (p.verification_url) {
    doc.text("Vérification : " + p.verification_url, M, pageH - 30);
  }

  return doc.output("blob");
}