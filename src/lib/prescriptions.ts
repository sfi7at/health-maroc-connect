import { queryOptions } from "@tanstack/react-query";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

export interface RxItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionRow {
  id: string;
  provider_id: string | null;
  user_id: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  diagnosis: string | null;
  items: RxItem[];
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
  status: string;
  prescribed_at: string;
  expires_at: string | null;
  verification_token: string;
  created_at: string;
  updated_at: string;
}

export function prescriptionsByProviderQuery(providerId: string | undefined) {
  return queryOptions({
    queryKey: ["prescriptions", "provider", providerId ?? "none"],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as PrescriptionRow[];
    },
    staleTime: 15_000,
  });
}

export function prescriptionByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["prescription", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PrescriptionRow | null;
    },
  });
}

export interface VerifiedPrescription {
  id: string;
  prescribed_at: string;
  expires_at: string | null;
  status: string;
  diagnosis: string | null;
  items: RxItem[];
  patient_name: string;
  provider_name: string;
  provider_verified: boolean;
}

export async function verifyPrescriptionByToken(token: string): Promise<VerifiedPrescription | null> {
  const { data, error } = await supabase.rpc("verify_prescription", { _token: token });
  if (error) throw error;
  const row = (data ?? [])[0];
  return (row as unknown as VerifiedPrescription) ?? null;
}

function verifyUrl(token: string): string {
  if (typeof window === "undefined") return `/verify/prescription/${token}`;
  return `${window.location.origin}/verify/prescription/${token}`;
}

export async function renderPrescriptionPdf(rx: PrescriptionRow, providerName: string): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  let y = 18;

  // Header band
  doc.setFillColor(11, 37, 69); // #0B2545
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("HealthLink Pro", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Ordonnance médicale numérique", 14, 18);
  doc.setFontSize(8);
  doc.text(new Date(rx.prescribed_at).toLocaleDateString("fr-FR"), W - 14, 12, { align: "right" });
  doc.text(`N° ${rx.id.slice(0, 8).toUpperCase()}`, W - 14, 18, { align: "right" });

  y = 36;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(providerName || "Praticien", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  y += 5;
  doc.text("Praticien vérifié — HealthLink Maroc", 14, y);

  y += 10;
  doc.setDrawColor(220);
  doc.line(14, y, W - 14, y);

  y += 8;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Patient", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(rx.patient_name ?? "—", 40, y);
  if (rx.patient_age) {
    doc.text(`${rx.patient_age} ans`, 130, y);
  }
  if (rx.patient_gender) {
    doc.text(rx.patient_gender === "female" ? "Femme" : "Homme", 160, y);
  }

  if (rx.diagnosis) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Diagnostic", 14, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(rx.diagnosis, W - 60);
    doc.text(lines, 40, y);
    y += 5 * lines.length;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(14, 140, 127); // secondary
  doc.text("Prescription", 14, y);
  doc.setTextColor(20, 20, 20);
  y += 4;
  doc.setDrawColor(230);
  doc.line(14, y, W - 14, y);
  y += 6;

  doc.setFontSize(10);
  const items = rx.items?.length ? rx.items : [];
  items.forEach((it, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${it.name}`, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const parts: string[] = [];
    if (it.dosage) parts.push(`Dosage : ${it.dosage}`);
    if (it.frequency) parts.push(`Fréquence : ${it.frequency}`);
    if (it.duration) parts.push(`Durée : ${it.duration}`);
    if (parts.length) {
      doc.text(parts.join("   •   "), 18, y);
      y += 5;
    }
    if (it.instructions) {
      const wrapped = doc.splitTextToSize(`Instructions : ${it.instructions}`, W - 32);
      doc.text(wrapped, 18, y);
      y += 5 * wrapped.length;
    }
    doc.setFontSize(10);
    y += 3;
  });

  if (rx.notes) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Notes", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(rx.notes, W - 28);
    doc.text(wrapped, 14, y);
    y += 5 * wrapped.length;
    doc.setFontSize(10);
  }

  // QR + verification footer
  const qrDataUrl = await QRCode.toDataURL(verifyUrl(rx.verification_token), { width: 240, margin: 0 });
  const footerY = 268;
  doc.setDrawColor(220);
  doc.line(14, footerY - 4, W - 14, footerY - 4);
  doc.addImage(qrDataUrl, "PNG", 14, footerY, 28, 28);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text("Vérifiez l'authenticité de cette ordonnance :", 46, footerY + 6);
  doc.setTextColor(11, 37, 69);
  doc.text(verifyUrl(rx.verification_token), 46, footerY + 11);
  doc.setTextColor(90);
  doc.text(`Token : ${rx.verification_token}`, 46, footerY + 16);
  doc.text("Document généré par HealthLink Pro — usage médical uniquement.", 46, footerY + 22);

  return doc.output("blob");
}

export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl(token), { width: 240, margin: 1 });
}

export function verificationUrl(token: string): string {
  return verifyUrl(token);
}