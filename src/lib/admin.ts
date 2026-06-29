import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type StaffRole =
  | "admin"
  | "moderator"
  | "content_manager"
  | "verification_manager"
  | "support_agent"
  | "analytics_viewer";

export const STAFF_ROLES: StaffRole[] = [
  "admin",
  "moderator",
  "content_manager",
  "verification_manager",
  "support_agent",
  "analytics_viewer",
];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Super Admin",
  moderator: "Modérateur",
  content_manager: "Gestionnaire de contenu",
  verification_manager: "Vérificateur",
  support_agent: "Support",
  analytics_viewer: "Analytics",
};

/** Returns the staff roles the current user holds, or empty array. */
export function useStaffRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-roles", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const all = (data ?? []).map((r) => r.role as string);
      return all.filter((r): r is StaffRole => STAFF_ROLES.includes(r as StaffRole));
    },
  });
}

export function useIsAdmin() {
  const q = useStaffRoles();
  return {
    isStaff: (q.data?.length ?? 0) > 0,
    isSuperAdmin: q.data?.includes("admin") ?? false,
    roles: q.data ?? [],
    isLoading: q.isLoading,
  };
}

export function hasPermission(roles: StaffRole[], allowed: StaffRole[]): boolean {
  if (roles.includes("admin")) return true;
  return roles.some((r) => allowed.includes(r));
}

/** Records an admin action in the audit log. Best-effort, never throws. */
export async function logAdminAction(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({
      actor_id: u.user?.id ?? null,
      action,
      entity_type,
      entity_id,
      metadata: metadata as never,
    });
  } catch {
    // ignore
  }
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    const blob = new Blob(["\n"], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}