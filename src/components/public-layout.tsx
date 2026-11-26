import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./brand";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="/#overview" className="hover:text-foreground">Overview</a>
            <a href="/#how" className="hover:text-foreground">How It Works</a>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <p>© CardioFusion · Not a medical device · Findings are not diagnoses</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/disclaimer" className="hover:text-foreground">Medical disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <PublicLayout>
      <div className="flex justify-center bg-surface-gradient px-4 py-12 md:py-20">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </PublicLayout>
  );
}
