import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProfile, updateProfile } from "@/lib/smartneb.functions";
import { DoctorPage } from "@/components/smartneb/doctor-layout";
import { LoadingSkeleton } from "@/components/smartneb/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/doctor/profile")({
  head: () => ({
    meta: [
      { title: "Clinician Profile — SmartNeb" },
      {
        name: "description",
        content: "Manage your SmartNeb clinician identity, contact details and patient panel size.",
      },
      { property: "og:title", content: "Clinician Profile — SmartNeb" },
      {
        property: "og:description",
        content: "Update the contact details your care team and patients see.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorProfilePage,
});

function DoctorProfilePage() {
  return (
    <DoctorPage title="Clinician Profile" subtitle="Your identity across the SmartNeb care team">
      {({ patients, signedIn }) => {
        const qc = useQueryClient();
        const profile = useQuery({
          queryKey: ["profile"],
          queryFn: () => getProfile(),
          enabled: signedIn,
          retry: false,
        });
        const [fullName, setFullName] = useState("");
        const [phone, setPhone] = useState("");

        useEffect(() => {
          if (profile.data) {
            setFullName(profile.data.full_name ?? "");
            setPhone(profile.data.phone ?? "");
          }
        }, [profile.data]);

        const save = useMutation({
          mutationFn: () =>
            updateProfile({ data: { full_name: fullName.trim(), phone: phone.trim() } }),
          onSuccess: () => {
            toast.success("Profile updated");
            void qc.invalidateQueries({ queryKey: ["profile"] });
            void qc.invalidateQueries({ queryKey: ["me"] });
          },
          onError: (e: Error) => toast.error(e.message),
        });

        if (profile.isPending) return <LoadingSkeleton rows={3} />;

        return (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <form
              className="panel space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (fullName.trim().length < 2) {
                  toast.error("Enter your full name");
                  return;
                }
                save.mutate();
              }}
            >
              <h2 className="font-display text-sm font-semibold">Contact details</h2>
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 ..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.data?.email ?? ""} readOnly disabled />
              </div>
              <Button type="submit" disabled={save.isPending}>
                Save profile
              </Button>
            </form>

            <aside className="panel space-y-3 p-5">
              <h2 className="font-display text-sm font-semibold">Practice summary</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Assigned patients</span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {patients.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active alerts</span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {patients.reduce((n, p) => n + p.activeAlerts, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">In therapy now</span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {patients.filter((p) => p.sessionStatus === "running").length}
                </span>
              </div>
              <Badge variant="secondary">Clinician account</Badge>
              <p className="text-xs text-muted-foreground">
                Patient assignments are managed by administrators.
              </p>
            </aside>
          </div>
        );
      }}
    </DoctorPage>
  );
}
