import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./states";

const LABEL: Record<string, string> = {
  doctor: "Doctor",
  caregiver: "Caregiver",
  admin: "Admin",
  "super-admin": "Super admin",
};

export function RolePlaceholder({ role }: { role: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg space-y-6">
        <EmptyState
          title={`${LABEL[role] ?? role} workspace is next`}
          description="The patient portal is live. Clinical, caregiver and administration workspaces are the next phase of the build."
        />
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
