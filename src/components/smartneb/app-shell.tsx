import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Bot,
  CalendarCheck,
  ClipboardList,
  FileText,
  NotebookPen,
  Siren,
  Users,
  Gauge as GaugeIcon,
  HeartHandshake,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Stethoscope,
  User,
  Wind,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listNotifications, type MeContext } from "@/lib/smartneb.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "./theme";
import { useSignedIn } from "./use-signed-in";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof Activity };

export const patientNav: NavItem[] = [
  { label: "Dashboard", to: "/patient/dashboard", icon: LayoutDashboard },
  { label: "My Nebulizer", to: "/patient/nebulizer", icon: Wind },
  { label: "Health Monitoring", to: "/patient/monitoring", icon: Activity },
  { label: "Nebulization", to: "/patient/nebulization", icon: GaugeIcon },
  { label: "Adherence", to: "/patient/adherence", icon: CalendarCheck },
  { label: "Health History", to: "/patient/history", icon: History },
  { label: "Alerts", to: "/patient/alerts", icon: AlertTriangle },
  { label: "Reports", to: "/patient/reports", icon: FileText },
  { label: "AI Assistant", to: "/patient/assistant", icon: Bot },
  { label: "Profile", to: "/patient/profile", icon: User },
  { label: "Settings", to: "/patient/settings", icon: Settings },
];

export const doctorNav: NavItem[] = [
  { label: "Clinical Dashboard", to: "/doctor/dashboard", icon: Stethoscope },
];

export const caregiverNav: NavItem[] = [
  { label: "Dashboard", to: "/caregiver/dashboard", icon: HeartHandshake },
  { label: "My Patients", to: "/caregiver/patients", icon: Users },
  { label: "Alerts", to: "/caregiver/alerts", icon: AlertTriangle },
  { label: "Emergency SOS", to: "/caregiver/sos", icon: Siren },
  { label: "Care Plans", to: "/caregiver/care-plans", icon: ClipboardList },
  { label: "Notes", to: "/caregiver/notes", icon: NotebookPen },
  { label: "Profile", to: "/caregiver/profile", icon: User },
];

export const adminNav: NavItem[] = [
  { label: "Admin Console", to: "/admin/dashboard", icon: ShieldCheck },
];

export const superAdminNav: NavItem[] = [
  { label: "Platform Console", to: "/super-admin/dashboard", icon: ShieldCheck },
];


export const roleHome: Record<MeContext["role"], string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  caregiver: "/caregiver/dashboard",
  admin: "/admin/dashboard",
  super_admin: "/super-admin/dashboard",
};

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Primary" className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Wind className="size-5" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold">SmartNeb</p>
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          Respiratory IoT
        </p>
      </div>
    </div>
  );
}

function NotificationBell() {
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    enabled: signedIn === true,
    retry: false,
    refetchInterval: signedIn === true ? 30_000 : false,
  });

  useEffect(() => {
    if (signedIn !== true) return;
    const channel = supabase
      .channel("notification-bell-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, signedIn]);

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${unread} unread`}>
          <span className="relative">
            <Bell className="size-4" />
            {unread > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-critical text-[10px] font-semibold text-critical-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-4 py-3 font-display text-sm font-semibold">Notifications</p>
        <ScrollArea className="max-h-80">
          {(data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">You are all caught up.</p>
          ) : (
            <ul className="divide-y">
              {(data ?? []).map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({
  me,
  nav,
  title,
  subtitle,
  actions,
  children,
}: {
  me: MeContext;
  nav: NavItem[];
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (me.isActive === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Account deactivated</h1>
          <p className="text-sm text-muted-foreground">
            Your SmartNeb access has been suspended by an administrator. Contact your care
            organisation to restore access.
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 size-3.5" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
          <Brand />
          <div className="mt-6 flex-1 overflow-y-auto">
            <NavList items={nav} />
          </div>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
            <p className="truncate text-sm font-medium">{me.fullName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {me.role.replace("_", " ")}
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={signOut}>
              <LogOut className="mr-2 size-3.5" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-sidebar p-4">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Brand />
                  <div className="mt-6">
                    <NavList items={nav} onNavigate={() => setOpen(false)} />
                  </div>
                  <Button variant="outline" size="sm" className="mt-6 w-full" onClick={signOut}>
                    <LogOut className="mr-2 size-3.5" /> Sign out
                  </Button>
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                {actions}
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6">{children}</main>

          <footer className="flex items-center gap-2 border-t px-6 py-4 text-xs text-muted-foreground">
            <Stethoscope className="size-3.5" aria-hidden />
            SmartNeb is a monitoring aid and does not replace professional medical judgment.
            <BookOpenCheck className="ml-auto size-3.5" aria-hidden />
          </footer>
        </div>
      </div>
    </div>
  );
}
