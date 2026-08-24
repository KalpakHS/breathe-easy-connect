import { createFileRoute } from "@tanstack/react-router";
import { CaregiverPage } from "@/components/smartneb/caregiver-layout";
import { SOSPanel } from "@/components/smartneb/sos-panel";
import { useSignedIn } from "@/components/smartneb/use-signed-in";

export const Route = createFileRoute("/_authenticated/caregiver/sos")({
  head: () => ({
    meta: [
      { title: "Emergency SOS — SmartNeb Caregiver" },
      {
        name: "description",
        content:
          "Real-time emergency SOS events from your assigned patients with vitals, device status and severity, plus acknowledge and resolve actions.",
      },
      { property: "og:title", content: "Emergency SOS — SmartNeb Caregiver" },
      { property: "og:description", content: "Live emergency events from the patients you support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareSOSPage,
});

function CareSOSPage() {
  const signedIn = useSignedIn() === true;
  return (
    <CaregiverPage title="Emergency SOS" subtitle="Live emergencies from your assigned patients">
      {() => (
        <div className="space-y-5">
          <SOSPanel enabled={signedIn} canRespond title="Active emergencies" />
          <SOSPanel enabled={signedIn} canRespond={false} includeResolved title="Emergency history" />
        </div>
      )}
    </CaregiverPage>
  );
}
