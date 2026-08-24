import { createFileRoute } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { DoctorPage } from "@/components/smartneb/doctor-layout";
import { SOSPanel } from "@/components/smartneb/sos-panel";

export const Route = createFileRoute("/_authenticated/doctor/sos")({
  head: () => ({
    meta: [
      { title: "Emergency SOS — SmartNeb Clinician" },
      {
        name: "description",
        content:
          "Live emergency SOS console: acknowledge and resolve patient-raised emergencies with the vitals captured at the moment of the alarm.",
      },
      { property: "og:title", content: "Emergency SOS — SmartNeb Clinician" },
      {
        property: "og:description",
        content: "Respond to patient emergencies in real time from one clinician console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorSOSPage,
});

function DoctorSOSPage() {
  return (
    <DoctorPage title="Emergency SOS" subtitle="Live emergencies raised by your assigned patients">
      {({ signedIn }) => (
        <div className="space-y-6">
          <div className="panel flex items-start gap-3 border-critical/40 bg-critical/5 p-5">
            <Siren className="mt-0.5 size-5 text-critical" aria-hidden />
            <div>
              <h2 className="font-display text-sm font-semibold">Immediate response protocol</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Acknowledge within 60 seconds so the patient and caregivers see that help is coming,
                then resolve once the patient is stable or escalated to emergency services.
              </p>
            </div>
          </div>

          <SOSPanel enabled={signedIn} title="Active emergencies" />
          <SOSPanel
            enabled={signedIn}
            includeResolved
            canRespond={false}
            title="Full SOS history"
          />
        </div>
      )}
    </DoctorPage>
  );
}
