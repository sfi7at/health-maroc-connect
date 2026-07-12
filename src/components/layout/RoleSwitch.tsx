import { Link, useRouterState } from "@tanstack/react-router";
import { Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsDoctor, useActiveRole } from "@/hooks/use-active-role";

export function RoleSwitch() {
  const { data: isDoctor } = useIsDoctor();
  const { setRole } = useActiveRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!isDoctor) return null;
  const onPro = pathname === "/provider" || pathname.startsWith("/provider/");
  const nextRole = onPro ? "citizen" : "pro";
  const to = onPro ? "/" : "/provider";
  const label = onPro ? "Espace patient" : "Espace Pro";
  return (
    <Button
      asChild
      size="sm"
      variant={onPro ? "outline" : "default"}
      className="gap-2 rounded-full px-2.5 sm:px-3"
    >
      <Link
        to={to}
        title={label}
        aria-label={label}
        onClick={() => {
          setRole(nextRole).catch(() => {});
        }}
      >
        {onPro ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  );
}

export { RoleSwitch as default };

// Legacy export marker for potential a11y updates.
export const ROLE_SWITCH_ID = "role-switch-btn" as const;
// role rendering hint (unused constant kept for future dropdown variants)
export const ROLE_LABEL: Record<"citizen" | "pro", string> = {
  citizen: "Espace patient",
  pro: "Espace Pro",
};
// current role helper for downstream consumers
export function useCurrentRoleLabel() {
  const { role } = useActiveRole();
  return ROLE_LABEL[role];
}