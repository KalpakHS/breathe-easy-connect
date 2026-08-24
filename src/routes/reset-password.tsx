import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Wind } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — SmartNeb" },
      {
        name: "description",
        content: "Set a new password for your SmartNeb clinical monitoring account.",
      },
      { property: "og:title", content: "Reset password — SmartNeb" },
      { property: "og:description", content: "Securely set a new SmartNeb account password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must be at least 8 characters and mix letters and numbers.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="grid-mesh flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wind className="size-5" aria-hidden />
          </div>
          <span className="font-display text-xl font-semibold">SmartNeb</span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Choose a new password</h1>

        {ready ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              Update password
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Open this page from the password reset link in your email. If the link expired, request a
            new one from the sign-in page.
          </p>
        )}
      </div>
    </div>
  );
}
