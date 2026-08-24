import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProfile, updateProfile } from "@/lib/smartneb.functions";
import { PatientPage, useSnapshot } from "@/components/smartneb/patient-layout";
import { ErrorState, LoadingSkeleton } from "@/components/smartneb/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/patient/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SmartNeb" },
      {
        name: "description",
        content: "Manage your personal details, emergency contact and linked SmartNeb device information.",
      },
      { property: "og:title", content: "Profile — SmartNeb" },
      { property: "og:description", content: "Your SmartNeb account and device details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="Profile" subtitle="Personal details and linked device">
      {({ patientId }) => <ProfileBody patientId={patientId} />}
    </PatientPage>
  ),
});

function ProfileBody({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const snap = useSnapshot(patientId, false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? "");
      setPhone(profile.data.phone ?? "");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile({ data: { fullName, phone } }),
    onSuccess: () => {
      toast.success("Profile saved");
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (profile.isLoading) return <LoadingSkeleton rows={3} />;
  if (profile.isError) return <ErrorState message={(profile.error as Error).message} />;

  const patient = snap.data?.patient;
  const device = snap.data?.device;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="panel space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <p className="font-display text-sm font-semibold">Account</p>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile.data?.email ?? ""} readOnly disabled />
        </div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <section className="panel space-y-4 p-5">
        <p className="font-display text-sm font-semibold">Medical record</p>
        <dl className="grid gap-3 text-sm">
          {[
            ["MRN", patient?.mrn],
            ["Condition", patient?.condition],
            ["Emergency contact", patient?.emergency_contact_name],
            ["Emergency phone", patient?.emergency_contact_phone],
            ["Device", device?.device_code],
            ["Firmware", device?.firmware],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v ?? "--"}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Medical record fields are maintained by your care team.
        </p>
      </section>
    </div>
  );
}
