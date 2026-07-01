import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmailVerifyBanner } from "@/components/auth/EmailVerifyBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { registerPWA } from "@/lib/pwa-register";
import { installObservability } from "@/lib/observability";
import { initPreferences } from "@/hooks/use-preferences";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HealthLink Maroc — Tous les services de santé en une app" },
      {
        name: "description",
        content:
          "HealthLink Maroc centralise médecins, pharmacies, hôpitaux, laboratoires, don du sang et téléconsultation dans une application moderne et sécurisée.",
      },
      { name: "author", content: "HealthLink Maroc" },
      { name: "theme-color", content: "#0E9F6E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "HealthLink" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "HealthLink Maroc — Tous les services de santé en une app" },
      {
        property: "og:description",
        content: "Tous les services de santé du Maroc, réunis dans une application moderne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@HealthLinkMaroc" },
      { name: "twitter:title", content: "HealthLink Maroc — Tous les services de santé en une app" },
      { name: "description", content: "HealthLink Maroc is a comprehensive Moroccan health super app centralizing all healthcare services." },
      { property: "og:description", content: "HealthLink Maroc is a comprehensive Moroccan health super app centralizing all healthcare services." },
      { name: "twitter:description", content: "HealthLink Maroc is a comprehensive Moroccan health super app centralizing all healthcare services." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/016a0bcb-b7bb-42d0-a5e9-6d9c76d57ae3/id-preview-3bb12778--6cf10384-a539-48ba-bbaf-3e985b0863af.lovable.app-1782704367392.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/016a0bcb-b7bb-42d0-a5e9-6d9c76d57ae3/id-preview-3bb12778--6cf10384-a539-48ba-bbaf-3e985b0863af.lovable.app-1782704367392.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "canonical", href: "/" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    void registerPWA();
    installObservability();
    initPreferences();
  }, []);

  const isFullscreen =
    location.pathname.startsWith("/auth") || location.pathname.startsWith("/reset-password");
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      {isFullscreen || isAdmin ? (
        <Outlet />
      ) : (
        <AppShell>
          {/* Required: nested routes render here. */}
          <EmailVerifyBanner />
          <Outlet />
        </AppShell>
      )}
      <Toaster />
      <InstallPrompt />
    </QueryClientProvider>
  );
}
