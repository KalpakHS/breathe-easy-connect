/**
 * ESP32 telemetry service layer (Firebase Realtime Database).
 *
 * The only module that talks to the Realtime Database. UI components consume
 * the normalized `DeviceTelemetry` model produced here.
 */
import { onValue, ref, set, type Unsubscribe } from "firebase/database";
import { getRealtimeDb, isFirebaseConfigured } from "@/lib/firebase";

export type DeviceTelemetry = {
  bpm: number | null;
  spo2: number | null;
  bodyTemperature: number | null;
  ambientTemperature: number | null;
  battery: {
    voltage: number | null;
    percentage: number | null;
    current: number | null;
    power: number | null;
    temperature: number | null;
  };
  nebulizer: { relay: boolean };
  lastUpdated: number | null;
  online: boolean;
};

export const EMPTY_TELEMETRY: DeviceTelemetry = {
  bpm: null,
  spo2: null,
  bodyTemperature: null,
  ambientTemperature: null,
  battery: { voltage: null, percentage: null, current: null, power: null, temperature: null },
  nebulizer: { relay: false },
  lastUpdated: null,
  online: false,
};

/** Seconds without a value change after which the ESP32 counts as offline. */
export const OFFLINE_AFTER_MS = Number(
  (import.meta.env['VITE_DEVICE_OFFLINE_AFTER_MS'] as string) || 45_000,
);

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Physiological / hardware plausibility gates — invalid readings become null. */
function inRange(v: number | null, min: number, max: number): number | null {
  return v == null || v < min || v > max ? null : v;
}

export function normalize(raw: Record<string, unknown> | null): Omit<DeviceTelemetry, "online"> {
  if (!raw) return { ...EMPTY_TELEMETRY };
  return {
    bpm: inRange(num(raw['BPM']), 30, 220),
    spo2: inRange(num(raw['SpO2']), 85, 100),
    bodyTemperature: inRange(num(raw['BodyTemp']), 30, 45),
    ambientTemperature: inRange(num(raw['AmbientTemp']), -20, 60),
    battery: {
      voltage: inRange(num(raw['BatteryVoltage']), 2.5, 4.5),
      percentage: inRange(num(raw['BatteryPercent']), 0, 100),
      current: num(raw['BatteryCurrent']),
      power: num(raw['BatteryPower']),
      temperature: inRange(num(raw['BatteryTemp']), -20, 90),
    },
    nebulizer: { relay: raw['Relay'] === true || raw['Relay'] === "true" || raw['Relay'] === 1 },
    lastUpdated: Date.now(),
  };
}

export type TelemetryEvent =
  | { kind: "data"; telemetry: Omit<DeviceTelemetry, "online"> }
  | { kind: "error"; message: string };

/** Subscribe to a device node (e.g. "Patient1"). Returns an unsubscribe fn. */
export function subscribeTelemetry(node: string, cb: (e: TelemetryEvent) => void): Unsubscribe {
  const db = getRealtimeDb();
  if (!db) {
    cb({ kind: "error", message: "Firebase is not configured for this deployment." });
    return () => {};
  }
  return onValue(
    ref(db, `/${node}`),
    (snap) => cb({ kind: "data", telemetry: normalize(snap.val() as Record<string, unknown>) }),
    (err) => cb({ kind: "error", message: err.message }),
  );
}

/** Subscribe to Firebase connectivity itself (not the ESP32). */
export function subscribeFirebaseConnection(cb: (connected: boolean) => void): Unsubscribe {
  const db = getRealtimeDb();
  if (!db) {
    cb(false);
    return () => {};
  }
  return onValue(ref(db, ".info/connected"), (snap) => cb(snap.val() === true));
}

/** Physical relay control: /<node>/Relay = true | false. */
export async function setRelay(node: string, on: boolean): Promise<void> {
  const db = getRealtimeDb();
  if (!db) throw new Error("Unable to connect to device data");
  await set(ref(db, `/${node}/Relay`), on);
}

export { isFirebaseConfigured };
