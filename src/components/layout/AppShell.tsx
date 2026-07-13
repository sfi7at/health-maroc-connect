import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="lg:pl-72">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}