import { useEffect, useRef, useState } from "react";
import { fetchRoute } from "../utils/route";
import { distanceKm } from "../utils/maps";

const REFETCH_AFTER_KM = 0.15;
const REFETCH_AFTER_MS = 60000;

/**
 * Road route + driving time from the responder to the civilian ([lng, lat] each).
 * Re-routes only when the responder has moved ~150 m or a minute has passed, so the
 * free router isn't hammered by the 8-second position updates. null until known.
 */
export default function useRoadRoute(from, to) {
  const [route, setRoute] = useState(null);
  const last = useRef(null);
  const fromKey = from ? `${from[0]},${from[1]}` : "";
  const toKey = to ? `${to[0]},${to[1]}` : "";

  useEffect(() => {
    if (!fromKey || !toKey) return undefined;
    const a = fromKey.split(",").map(Number);
    const b = toKey.split(",").map(Number);
    const prev = last.current;
    if (prev && prev.toKey === toKey && Date.now() - prev.at < REFETCH_AFTER_MS && distanceKm(prev.a[1], prev.a[0], a[1], a[0]) < REFETCH_AFTER_KM) {
      return undefined;
    }
    let cancelled = false;
    fetchRoute(a, b)
      .then((r) => {
        if (cancelled) return;
        last.current = { a, toKey, at: Date.now() };
        setRoute(r);
      })
      .catch(() => {
        /* keep the straight-line estimate */
      });
    return () => {
      cancelled = true;
    };
  }, [fromKey, toKey]);

  return fromKey && toKey ? route : null;
}
