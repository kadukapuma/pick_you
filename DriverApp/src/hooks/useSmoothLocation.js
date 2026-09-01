import { useEffect, useRef, useState } from "react";

const EARTH_RADIUS_METERS = 6371000;
const MAX_ACCURACY_METERS = 100;
const MAX_PLAUSIBLE_SPEED_MPS = 60;
const SNAP_AFTER_MS = 20000;
const STALE_AFTER_MS = 30000;
const MIN_GPS_HEADING_SPEED_MPS = 3;
const ROUTE_SNAP_MAX_METERS = 60;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toRadians = (value) => (value * Math.PI) / 180;
const toDegrees = (value) => (value * 180) / Math.PI;

const distanceMeters = (from, to) => {
  const latDelta = toRadians(to.latitude - from.latitude);
  const lngDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bearingBetween = (from, to) => {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const lngDelta = toRadians(to.longitude - from.longitude);
  const y = Math.sin(lngDelta) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(lngDelta);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const shortestHeadingDelta = (from, to) => ((to - from + 540) % 360) - 180;
const easeInOut = (progress) => progress * progress * (3 - 2 * progress);

// Local tangent-plane projection: good enough over the few-hundred-meter
// spans between consecutive GPS fixes, and much cheaper than haversine
// per-segment since it runs across the whole route on every fix.
const localScale = (refLat) => {
  const latScale = 111320;
  return { latScale, lngScale: latScale * Math.cos(toRadians(refLat)) };
};

const projectPointOnSegment = (p, a, b, scale) => {
  const ax = a.longitude * scale.lngScale, ay = a.latitude * scale.latScale;
  const bx = b.longitude * scale.lngScale, by = b.latitude * scale.latScale;
  const px = p.longitude * scale.lngScale, py = p.latitude * scale.latScale;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
  const point = {
    latitude: a.latitude + t * (b.latitude - a.latitude),
    longitude: a.longitude + t * (b.longitude - a.longitude),
  };
  const distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  return { t, point, distance };
};

const projectOntoRoute = (p, route) => {
  if (!route || route.length < 2) return null;
  const scale = localScale(p.latitude);
  let best = null;
  for (let i = 0; i < route.length - 1; i++) {
    const projected = projectPointOnSegment(p, route[i], route[i + 1], scale);
    if (!best || projected.distance < best.distance) {
      best = { index: i, ...projected };
    }
  }
  return best;
};

// Only valid for forward motion along the route (from earlier index/t to a
// later one) - a backward projection means the raw fixes aren't tracking
// this route usefully, so callers fall back to a straight chord.
const buildRoutePath = (route, from, to) => {
  if (from.index > to.index || (from.index === to.index && from.t > to.t)) return null;
  const path = [from.point];
  for (let i = from.index + 1; i <= to.index; i++) path.push(route[i]);
  path.push(to.point);
  return path;
};

const interpolateAlongPath = (path, fraction) => {
  if (path.length < 2) return path[0];
  const lengths = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceMeters(path[i], path[i + 1]);
    lengths.push(d);
    total += d;
  }
  if (total <= 0) return path[0];
  let remaining = clamp(fraction, 0, 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const segFraction = lengths[i] === 0 ? 0 : clamp(remaining / lengths[i], 0, 1);
      const a = path[i], b = path[i + 1];
      return {
        latitude: a.latitude + (b.latitude - a.latitude) * segFraction,
        longitude: a.longitude + (b.longitude - a.longitude) * segFraction,
      };
    }
    remaining -= lengths[i];
  }
  return path[path.length - 1];
};

const normalizeSample = (sample) => {
  const latitude = Number(sample?.latitude);
  const longitude = Number(sample?.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  const recordedAt = sample?.recorded_at
    ? Date.parse(sample.recorded_at)
    : Number(sample?.timestamp) || Date.now();

  return {
    ...sample,
    latitude,
    longitude,
    heading: Number(sample?.heading),
    speed: Number(sample?.speed),
    accuracy: Number(sample?.accuracy),
    sequence: Number(sample?.sequence),
    isProvisional:
      !sample?.recorded_at &&
      !Number.isFinite(Number(sample?.timestamp)) &&
      !Number.isFinite(Number(sample?.accuracy)) &&
      !Number.isFinite(Number(sample?.sequence)),
    recordedAt: Number.isFinite(recordedAt) ? recordedAt : Date.now(),
    receivedAt: Date.now(),
  };
};

export function useSmoothLocation(rawLocation, routePoints) {
  const rawLatitude = rawLocation?.latitude;
  const rawLongitude = rawLocation?.longitude;
  const rawHeading = rawLocation?.heading;
  const rawSpeed = rawLocation?.speed;
  const rawAccuracy = rawLocation?.accuracy;
  const rawRecordedAt = rawLocation?.recorded_at;
  const rawTimestamp = rawLocation?.timestamp;
  const rawSequence = rawLocation?.sequence;
  const [location, setLocation] = useState(null);
  const [trackingState, setTrackingState] = useState("waiting");
  const [lastRejected, setLastRejected] = useState(null);
  const displayedRef = useRef(null);
  const acceptedRef = useRef(null);
  const animationRef = useRef(null);
  const locationRef = useRef(null);
  const routePointsRef = useRef(routePoints);
  routePointsRef.current = routePoints;

  useEffect(() => {
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (rawLatitude == null || rawLongitude == null) return;
    const sample = normalizeSample({
      latitude: rawLatitude,
      longitude: rawLongitude,
      heading: rawHeading,
      speed: rawSpeed,
      accuracy: rawAccuracy,
      recorded_at: rawRecordedAt,
      timestamp: rawTimestamp,
      sequence: rawSequence,
    });
    const previous = acceptedRef.current;
    const reject = (reason) => {
      setLastRejected((prev) => (prev === reason ? prev : reason));
      setTrackingState((prev) => (prev === "rejected" ? prev : "rejected"));
    };

    if (!sample) {
      reject("invalid-coordinate");
      return;
    }
    if (rawRecordedAt && Date.now() - sample.recordedAt > STALE_AFTER_MS) {
      reject("stale");
      return;
    }
    if (Number.isFinite(sample.accuracy) && sample.accuracy > MAX_ACCURACY_METERS) {
      reject("low-accuracy");
      return;
    }
    if (
      previous &&
      Number.isFinite(sample.sequence) &&
      Number.isFinite(previous.sequence) &&
      sample.sequence <= previous.sequence
    ) {
      reject("out-of-order");
      return;
    }

    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);

    if (!previous || !displayedRef.current) {
      const first = {
        latitude: sample.latitude,
        longitude: sample.longitude,
        heading: Number.isFinite(sample.heading) ? sample.heading : 0,
      };
      acceptedRef.current = { ...sample, ...first };
      displayedRef.current = first;
      locationRef.current = first;
      setLocation(first);
      setLastRejected((prev) => (prev === null ? prev : null));
      setTrackingState((prev) => (prev === "snapped" ? prev : "snapped"));
      return;
    }

    // Screens use a Colombo coordinate while GPS is loading. Treat that point as
    // a camera placeholder, not a real sample, and replace it with the first fix.
    if (previous.isProvisional && !sample.isProvisional) {
      const firstGpsFix = {
        latitude: sample.latitude,
        longitude: sample.longitude,
        heading: Number.isFinite(sample.heading) ? sample.heading : previous.heading,
      };
      acceptedRef.current = { ...sample, ...firstGpsFix };
      displayedRef.current = firstGpsFix;
      locationRef.current = firstGpsFix;
      setLocation(firstGpsFix);
      setLastRejected((prev) => (prev === null ? prev : null));
      setTrackingState((prev) => (prev === "snapped" ? prev : "snapped"));
      return;
    }

    const distance = distanceMeters(previous, sample);
    const sampleDeltaMs = Math.max(sample.recordedAt - previous.recordedAt, 1);
    const receiveGapMs = sample.receivedAt - previous.receivedAt;
    const impliedSpeed = distance / (sampleDeltaMs / 1000);

    if (
      receiveGapMs < SNAP_AFTER_MS &&
      distance > 100 &&
      impliedSpeed > MAX_PLAUSIBLE_SPEED_MPS
    ) {
      reject("impossible-jump");
      return;
    }

    const jitterRadius = clamp(
      Number.isFinite(sample.accuracy) ? sample.accuracy * 0.35 : 4,
      4,
      12,
    );
    const isStationary = !Number.isFinite(sample.speed) || sample.speed < 1.5;
    if (distance < jitterRadius && isStationary) {
      acceptedRef.current = {
        ...sample,
        latitude: previous.latitude,
        longitude: previous.longitude,
        heading: previous.heading,
      };
      setLastRejected((prev) => (prev === null ? prev : null));
      setTrackingState((prev) => (prev === "steady" ? prev : "steady"));
      return;
    }

    const movingBearing = distance >= 4 ? bearingBetween(previous, sample) : previous.heading;
    const gpsHeadingIsReliable =
      Number.isFinite(sample.heading) &&
      sample.heading >= 0 &&
      sample.speed >= MIN_GPS_HEADING_SPEED_MPS;
    const rawHeading = gpsHeadingIsReliable ? sample.heading % 360 : movingBearing;
    const headingWeight = gpsHeadingIsReliable ? 0.45 : 0.35;

    const target = {
      latitude: previous.latitude + (sample.latitude - previous.latitude) * 0.75,
      longitude: previous.longitude + (sample.longitude - previous.longitude) * 0.75,
      heading:
        (previous.heading +
          shortestHeadingDelta(previous.heading, rawHeading) * headingWeight +
          360) %
        360,
    };
    acceptedRef.current = { ...sample, ...target };

    if (receiveGapMs >= SNAP_AFTER_MS) {
      displayedRef.current = target;
      locationRef.current = target;
      setLocation(target);
      setLastRejected((prev) => (prev === null ? prev : null));
      setTrackingState((prev) => (prev === "snapped" ? prev : "snapped"));
      return;
    }

    const start = displayedRef.current;
    const headingDelta = shortestHeadingDelta(start.heading, target.heading);
    const duration = clamp(sampleDeltaMs * 0.9, 800, 4500);
    const startedAt = Date.now();
    let lastPaintAt = 0;
    setLastRejected((prev) => (prev === null ? prev : null));
    setTrackingState((prev) => (prev === "animating" ? prev : "animating"));

    // Prefer walking the fetched road route over the two fixes' straight
    // chord, so cornering doesn't read as the vehicle cutting off-road -
    // only when both fixes actually sit close to that route.
    let routePath = null;
    const route = routePointsRef.current;
    if (route && route.length > 1) {
      const startProjection = projectOntoRoute(start, route);
      const targetProjection = projectOntoRoute(target, route);
      if (
        startProjection &&
        targetProjection &&
        startProjection.distance <= ROUTE_SNAP_MAX_METERS &&
        targetProjection.distance <= ROUTE_SNAP_MAX_METERS
      ) {
        routePath = buildRoutePath(route, startProjection, targetProjection);
      }
    }

    const animate = () => {
      const now = Date.now();
      const progress = clamp((now - startedAt) / duration, 0, 1);
      if (now - lastPaintAt >= 32 || progress === 1) {
        const eased = easeInOut(progress);
        const position = routePath
          ? interpolateAlongPath(routePath, eased)
          : {
              latitude: start.latitude + (target.latitude - start.latitude) * eased,
              longitude: start.longitude + (target.longitude - start.longitude) * eased,
            };
        const next = {
          latitude: position.latitude,
          longitude: position.longitude,
          heading: (start.heading + headingDelta * eased + 360) % 360,
        };
        lastPaintAt = now;
        displayedRef.current = next;
        locationRef.current = next;
        setLocation(next);
      }
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setTrackingState((prev) => (prev === "steady" ? prev : "steady"));
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [
    rawLatitude,
    rawLongitude,
    rawHeading,
    rawSpeed,
    rawAccuracy,
    rawRecordedAt,
    rawTimestamp,
    rawSequence,
  ]);

  return { location, trackingState, lastRejected };
}
