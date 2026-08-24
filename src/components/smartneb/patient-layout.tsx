import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe, getPatientSnapshot } from "@/lib/smartneb.functions";
import { AppShell, patientNav } from "./app-shell";
import { ErrorState, LoadingSkeleton } from "./states";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => getMe(), staleTime: 60_000 });
}

export function useSnapshot(patientId: string | null | undefined, live = true) {
  return useQuery({
    queryKey: ["snapshot", patientId],
    queryFn: () => getPatientSnapshot({ data: { patientId: patientId! } }),
    enabled: Boolean(patientId),
    refetchInterval: live ? 5_000 : false,
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
