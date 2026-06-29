import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/doctors/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <Navigate to="/providers/$id" params={{ id }} replace />;
  },
});
