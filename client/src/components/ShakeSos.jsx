import { useEffect, useRef, useState } from "react";
import { Smartphone } from "lucide-react";
import SosCountdown from "./SosCountdown";
import { useLang } from "../i18n/context";
import "./VoiceSos.css";

const STORAGE_KEY = "shakeSos";
const SHAKE_FORCE = 15; // m/s² above gravity — a deliberate, hard shake, not walking or a bump
const PEAK_GAP_MS = 250;
const SHAKES_NEEDED = 3;
const WINDOW_MS = 2500;

// Only phones/tablets have a motion sensor worth listening to.
const motionSupported = () =>
  typeof window !== "undefined" && "DeviceMotionEvent" in window && window.matchMedia?.("(pointer: coarse)").matches;

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Shake the phone hard 3 times to start the same 5-second cancellable SOS countdown as
 * Voice SOS — for when you can't look at or tap the screen. Opt-in, remembered on this
 * device, and only active while LifeLink is open (browsers don't allow background sensors).
 */
function ShakeSos({ onTrigger, disabled }) {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(readSaved);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const peaks = useRef([]);
  const lastPeak = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    busy.current = confirming || disabled;
  }, [confirming, disabled]);

  useEffect(() => {
    if (!enabled || !motionSupported()) return undefined;
    const onMotion = (event) => {
      if (busy.current) return;
      const a = event.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const force = Math.abs(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) - 9.81);
      const now = Date.now();
      if (force < SHAKE_FORCE || now - lastPeak.current < PEAK_GAP_MS) return;
      lastPeak.current = now;
      peaks.current = [...peaks.current.filter((ts) => now - ts < WINDOW_MS), now];
      if (peaks.current.length >= SHAKES_NEEDED) {
        peaks.current = [];
        navigator.vibrate?.([200, 100, 200]);
        setConfirming(true);
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled]);

  if (!motionSupported()) return null;

  const toggle = async () => {
    setError("");
    const next = !enabled;
    // iPhone asks for motion permission, and only from a tap.
    if (next && typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        if ((await DeviceMotionEvent.requestPermission()) !== "granted") {
          setError("Motion access was not allowed, so shake detection can't work.");
          return;
        }
      } catch {
        setError("Motion access was not allowed, so shake detection can't work.");
        return;
      }
    }
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* private mode — just not remembered */
    }
  };

  return (
    <>
      <div className="voice-sos">
        <button type="button" className={`voice-sos-btn${enabled ? " listening" : ""}`} onClick={toggle} aria-pressed={enabled}>
          <Smartphone size={16} />
          {enabled ? t("Shake SOS: on") : t("Shake SOS: off")}
        </button>
        <span className="voice-sos-hint">
          {enabled ? t("Shake your phone hard 3 times to start an SOS (while LifeLink is open).") : t("Turn on to send an SOS by shaking your phone.")}
        </span>
      </div>
      {error && <div className="voice-sos-error">{t(error)}</div>}
      {confirming && (
        <SosCountdown
          note={t("Shake detected.")}
          onFire={() => {
            setConfirming(false);
            onTrigger("");
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

export default ShakeSos;
