import { useEffect } from "react";
import { shareResponderLocation } from "../services/sos";

const MIN_GAP_MS = 8000;

/**
 * While `active` (the responder has an accepted / en-route alert), reports this
 * device's position to the server every few seconds so the civilian's tracking
 * map follows them. Stops when the alert is resolved or the page is left.
 */
export default function useShareResponderLocation(active) {
  useEffect(() => {
    if (!active || !navigator.geolocation?.watchPosition) return undefined;

    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSent < MIN_GAP_MS) return;
        lastSent = now;
        shareResponderLocation(position.coords.latitude, position.coords.longitude).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);
}
