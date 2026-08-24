import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, updateProfile } from "@/lib/smartneb.functions";
import { DoctorPage } from "@/components/smartneb/doctor-layout";
import { LoadingSkeleton } from "@/components/smartneb/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/doctor/settings")({
  head: () => ({
    meta: [
      { title: "Clinician Settings — SmartNeb" },
      {
        name: "description",
        content:
          "Control spoken critical alerts, email notifications, appearance and session security for your SmartNeb clinician account.",
      },
      { property: "og:title", content: "Clinician Settings — SmartNeb" },
      {
        property: "og:description",
        content: "Voice alerts, notifications, theme and sign-out for clinicians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorSettingsPage,
});

function DoctorSettingsPage() {
  const navigate = useNavigate();

  return (
    <DoctorPage title="Settings" subtitle="Alerting, appearance and session security">
      {({ signedIn }) => {
        const qc = useQueryClient();
        const profile = useQuery({
          queryKey: ["profile"],
          queryFn: () => getProfile(),
          enabled: signedIn,
          retry: false,
        });

        const [voice, setVoice] = useState(true);
        const [email, setEmail] = useState(true);
        const [theme, setTheme] = useState("system");

        useEffect(() => {
          if (profile.data) {
            setVoice(Boolean(profile.data.voice_alerts));
            setEmail(Boolean(profile.data.notify_email));
            setTheme(profile.data.theme ?? "system");
          }
        }, [profile.data]);

        const save = useMutation({
          mutationFn: (patch: {
            voice_alerts?: boolean;
            notify_email?: boolean;
            theme?: "light" | "dark" | "system";
          }) => updateProfile({ data: patch }),
          onSuccess: () => {
            toast.success("Settings saved");
            void qc.invalidateQueries({ queryKey: ["profile"] });
          },
          onError: (e: Error) => toast.error(e.message),
        });

        async function signOut() {
          await qc.cancelQueries();
          qc.clear();
          await supabase.auth.signOut();
          void navigate({ to: "/auth", replace: true });
        }

        if (profile.isPending) return <LoadingSkeleton rows={3} />;

        return (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="panel space-y-5 p-5">
              <h2 className="font-display text-sm font-semibold">Alerting</h2>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="voice-alerts" className="text-sm">
                    Spoken critical alerts
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reads critical desaturation and emergency SOS events aloud so you never miss them
                    while reviewing another chart.
                  </p>
                </div>
                <Switch
                  id="voice-alerts"
                  checked={voice}
                  onCheckedChange={(v) => {
                    setVoice(v);
                    save.mutate({ voice_alerts: v });
                  }}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="email-alerts" className="text-sm">
                    Email notifications
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Receive a summary email when one of your patients raises an emergency.
                  </p>
                </div>
                <Switch
                  id="email-alerts"
                  checked={email}
                  onCheckedChange={(v) => {
                    setEmail(v);
                    save.mutate({ notify_email: v });
                  }}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
                    toast.error("Speech synthesis is unavailable in this browser");
                    return;
                  }
                  window.speechSynthesis.speak(
                    new SpeechSynthesisUtterance(
                      "Critical alert. Patient oxygen saturation is below the prescribed threshold.",
                    ),
                  );
                }}
              >
                <Volume2 className="mr-2 size-4" aria-hidden /> Test voice alert
              </Button>
            </section>

            <section className="panel space-y-5 p-5">
              <h2 className="font-display text-sm font-semibold">Appearance &amp; session</h2>

              <div className="space-y-1.5">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={theme}
                  onValueChange={(v) => {
                    setTheme(v);
                    save.mutate({ theme: v as "light" | "dark" | "system" });
                  }}
                >
                  <SelectTrigger id="theme" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Match system</SelectItem>
                    <SelectItem value="light">Light (high contrast)</SelectItem>
                    <SelectItem value="dark">Dark (night shift)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-surface-2 p-4">
                <p className="text-sm font-medium">Sign out of SmartNeb</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ends this clinical session on the current device and clears cached patient data.
                </p>
                <Button variant="destructive" size="sm" className="mt-3" onClick={() => void signOut()}>
                  <LogOut className="mr-2 size-4" aria-hidden /> Sign out
                </Button>
              </div>
            </section>
          </div>
        );
      }}
    </DoctorPage>
  );
}
