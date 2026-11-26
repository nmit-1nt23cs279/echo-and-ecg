import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Stethoscope,
  ThermometerSun,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { LoadingState } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { loading, user, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  if (loading || !user) return <div className="px-6"><LoadingState label="Checking your session…" /></div>;

  const isPro = profile?.account_type === "medical_professional";
  const items = [
    ...(!isPro
      ? [
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/assessments/new", label: "New assessment", icon: FilePlus2 },
          { to: "/assessments", label: "Assessments", icon: ClipboardList },
          { to: "/symptoms", label: "Symptoms", icon: ThermometerSun },
          { to: "/reports", label: "Reports", icon: FileText },
        ]
      : [{ to: "/professional", label: "Professional", icon: Stethoscope }]),
    { to: "/profile", label: "Profile & health", icon: UserRound },
    ...(roles.includes("admin") ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ] as const;

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active =
          it.to === "/assessments"
            ? pathname === "/assessments" || (pathname.startsWith("/assessments/") && pathname !== "/assessments/new")
            : pathname === it.to || pathname.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t pt-4">
      <p className="truncate text-sm font-medium">{profile?.full_name || user.email}</p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      <button
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
        className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r bg-sidebar p-4 md:flex md:sticky md:top-0 md:h-screen">
        <div className="space-y-6">
          <Logo />
          {nav}
        </div>
        {footer}
      </aside>
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Logo />
        <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)} className="rounded-md p-2 hover:bg-muted">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="space-y-4 border-b bg-card p-4 md:hidden">
          {nav}
          {footer}
        </div>
      )}
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
