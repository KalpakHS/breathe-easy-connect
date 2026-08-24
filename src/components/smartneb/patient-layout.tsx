import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMe, getPatientSnapshot } from "@/lib/smartneb.functions";
import { AppShell, patientNav } from "./app-shell";
import { ErrorState, LoadingSkeleton } from "./states";

/** Tracks whether a Supabase session exists so authed queries never fire signed out. */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

export function useMe() {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    staleTime: 60_000,
    enabled: signedIn === true,
    retry: false,
  });
}

export function useSnapshot(patientId: string | null | undefined, live = true) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: ["snapshot", patientId],
    queryFn: () => getPatientSnapshot({ data: { patientId: patientId! } }),
    enabled: Boolean(patientId) && signedIn === true,
    refetchInterval: live ? 5_000 : false,
    retry: false,
  });
}

export function PatientPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: (ctx: { patientId: string; fullName: string }) => ReactNode;
}) {
  const me = useMe();

  if (me.isLoading) {
    return (
      <div className="p-8">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }
  if (me.isError || !me.data) {
    return (
      <div className="p-8">
        <ErrorState message={(me.error as Error)?.message} onRetry={() => me.refetch()} />
      </div>
    );
  }

  return (
    <AppShell me={me.data} nav={patientNav} title={title} subtitle={subtitle} actions={actions}>
      {me.data.patientId ? (
        children({ patientId: me.data.patientId, fullName: me.data.fullName })
      ) : (
        <ErrorState message="No patient record is linked to this account yet. Ask an administrator to link you to a patient." />
      )}
    </AppShell>
  );
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
