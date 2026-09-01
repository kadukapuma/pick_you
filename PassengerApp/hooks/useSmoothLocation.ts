import { useEffect, useRef, useState } from "react";

export type RawLocation = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  recorded_at?: string;
  timestamp?: number;
  sequence?: number;
};

export type SmoothCoordinate = {
  latitude: number;
  longitude: number;
  heading: number;
};

const R = 6371000;
const MIN_GPS_HEADING_SPEED_MPS = 3;
const ROUTE_SNAP_MAX_METERS = 60;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const rad = (v: number) => (v * Math.PI) / 180;
const deg = (v: number) => (v * 180) / Math.PI;
const headingDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;

const distance = (a: RawLocation, b: RawLocation) => {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const aLat = rad(a.latitude);
  const bLat = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat) * Math.cos(bLat) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const bearing = (a: RawLocation, b: RawLocation) => {
  const aLat = rad(a.latitude);
  const bLat = rad(b.latitude);
  const dLng = rad(b.longitude - a.longitude);
  return (deg(Math.atan2(
    Math.sin(dLng) * Math.cos(bLat),
    Math.cos(aLat) * Math.sin(bLat) - Math.sin(aLat) * Math.cos(bLat) * Math.cos(dLng),
  )) + 360) % 360;
};

export type RoutePoint = { latitude: number; longitude: number };

// Local tangent-plane projection: good enough over the few-hundred-meter
// spans between consecutive GPS fixes, and much cheaper than haversine
// per-segment since it runs across the whole route on every fix.
const localScale = (refLat: number) => {
  const latScale = 111320;
  return { latScale, lngScale: latScale * Math.cos(rad(refLat)) };
};

const projectPointOnSegment = (
  p: RoutePoint,
  a: RoutePoint,
  b: RoutePoint,
  scale: { latScale: number; lngScale: number },
) => {
  const ax = a.longitude * scale.lngScale, ay = a.latitude * scale.latScale;
  const bx = b.longitude * scale.lngScale, by = b.latitude * scale.latScale;
  const px = p.longitude * scale.lngScale, py = p.latitude * scale.latScale;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
  const point: RoutePoint = {
    latitude: a.latitude + t * (b.latitude - a.latitude),
    longitude: a.longitude + t * (b.longitude - a.longitude),
  };
  const distanceMeters = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  return { t, point, distance: distanceMeters };
};

type RouteProjection = { index: number; t: number; point: RoutePoint; distance: number };

const projectOntoRoute = (p: RoutePoint, route: RoutePoint[]): RouteProjection | null => {
  if (route.length < 2) return null;
  const scale = localScale(p.latitude);
  let best: RouteProjection | null = null;
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
const buildRoutePath = (
  route: RoutePoint[],
  from: RouteProjection,
  to: RouteProjection,
): RoutePoint[] | null => {
  if (from.index > to.index || (from.index === to.index && from.t > to.t)) return null;
  const path: RoutePoint[] = [from.point];
  for (let i = from.index + 1; i <= to.index; i++) path.push(route[i]);
  path.push(to.point);
  return path;
};

const interpolateAlongPath = (path: RoutePoint[], fraction: number): RoutePoint => {
  if (path.length < 2) return path[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distance(path[i] as RawLocation, path[i + 1] as RawLocation);
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

type Accepted = RawLocation & SmoothCoordinate & { recordedAt: number; receivedAt: number };

export function useSmoothLocation(
  raw?: RawLocation | null,
  resetKey?: string | number,
  routePoints?: RoutePoint[] | null,
) {
  const rawLatitude = raw?.latitude;
  const rawLongitude = raw?.longitude;
  const rawHeading = raw?.heading;
  const rawSpeed = raw?.speed;
  const rawAccuracy = raw?.accuracy;
  const rawRecordedAt = raw?.recorded_at;
  const rawTimestamp = raw?.timestamp;
  const rawSequence = raw?.sequence;
  const [location, setLocation] = useState<SmoothCoordinate | null>(null);
  const [trackingState, setTrackingState] = useState("waiting");
  const [lastRejected, setLastRejected] = useState<string | null>(null);
  const accepted = useRef<Accepted | null>(null);
  const displayed = useRef<SmoothCoordinate | null>(null);
  const frame = useRef<number | null>(null);
  const routePointsRef = useRef<RoutePoint[] | null | undefined>(routePoints);
  routePointsRef.current = routePoints;

  useEffect(() => () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
  }, []);

  useEffect(() => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    accepted.current = null;
    displayed.current = null;
    setLocation(null);
    setTrackingState("waiting");
    setLastRejected(null);
  }, [resetKey]);

  useEffect(() => {
    if (rawLatitude == null || rawLongitude == null) return;
    const input: RawLocation = {
      latitude: rawLatitude,
      longitude: rawLongitude,
      heading: rawHeading,
      speed: rawSpeed,
      accuracy: rawAccuracy,
      recorded_at: rawRecordedAt,
      timestamp: rawTimestamp,
      sequence: rawSequence,
    };
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    const now = Date.now();
    const recordedAt = rawRecordedAt ? Date.parse(rawRecordedAt) : Number(rawTimestamp) || now;
    const sample: Accepted = {
      ...input,
      latitude,
      longitude,
      heading: Number(rawHeading),
      recordedAt: Number.isFinite(recordedAt) ? recordedAt : now,
      receivedAt: now,
    } as Accepted;
    const previous = accepted.current;
    const reject = (reason: string) => {
      setLastRejected(reason);
      setTrackingState("rejected");
    };
    const snapToSample = () => {
      const first = {
        latitude,
        longitude,
        heading: Number.isFinite(sample.heading) ? sample.heading : 0,
      };
      accepted.current = { ...sample, ...first };
      displayed.current = first;
      setLocation(first);
      setLastRejected(null);
      setTrackingState("snapped");
    };

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return reject("invalid-coordinate");
    if (rawRecordedAt && now - sample.recordedAt > 30000) return reject("stale");
    if (Number.isFinite(Number(rawAccuracy)) && Number(rawAccuracy) > 100) return reject("low-accuracy");
    if (previous && Number.isFinite(Number(rawSequence)) && Number(rawSequence) <= Number(previous.sequence)) return reject("out-of-order");
    if (frame.current != null) cancelAnimationFrame(frame.current);

    if (!previous || !displayed.current) {
      snapToSample();
      return;
    }

    const previousHasSequence =
      Number.isFinite(Number(previous.sequence)) && Number(previous.sequence) > 0;
    const sampleHasSequence =
      Number.isFinite(Number(sample.sequence)) && Number(sample.sequence) > 0;
    if (!previousHasSequence && sampleHasSequence) {
      snapToSample();
      return;
    }

    const moved = distance(previous, sample);
    const sampleDelta = Math.max(sample.recordedAt - previous.recordedAt, 1);
    const receiveGap = sample.receivedAt - previous.receivedAt;
    if (receiveGap < 20000 && moved > 100 && moved / (sampleDelta / 1000) > 60) return reject("impossible-jump");

    const jitter = clamp(Number.isFinite(Number(rawAccuracy)) ? Number(rawAccuracy) * 0.35 : 4, 4, 12);
    if (moved < jitter && (!Number.isFinite(Number(rawSpeed)) || Number(rawSpeed) < 1.5)) {
      accepted.current = { ...sample, latitude: previous.latitude, longitude: previous.longitude, heading: previous.heading };
      setLastRejected(null);
      setTrackingState("steady");
      return;
    }

    const movingBearing = moved >= 4 ? bearing(previous, sample) : previous.heading;
    const gpsHeadingIsReliable =
      Number.isFinite(Number(rawHeading)) &&
      Number(rawHeading) >= 0 &&
      Number(rawSpeed) >= MIN_GPS_HEADING_SPEED_MPS;
    const measuredHeading = gpsHeadingIsReliable
      ? Number(rawHeading) % 360
      : movingBearing;
    const headingWeight = gpsHeadingIsReliable ? 0.45 : 0.35;

    const target: SmoothCoordinate = {
      latitude: previous.latitude + (latitude - previous.latitude) * 0.75,
      longitude: previous.longitude + (longitude - previous.longitude) * 0.75,
      heading:
        (previous.heading +
          headingDelta(previous.heading, measuredHeading) * headingWeight +
          360) %
        360,
    };
    accepted.current = { ...sample, ...target };
    if (receiveGap >= 20000) {
      displayed.current = target;
      setLocation(target);
      setLastRejected(null);
      setTrackingState("snapped");
      return;
    }

    const start = displayed.current;
    const turn = headingDelta(start.heading, target.heading);
    const duration = clamp(sampleDelta * 0.9, 800, 4500);
    const started = Date.now();
    let lastPaint = 0;
    setLastRejected(null);
    setTrackingState("animating");

    // Prefer walking the fetched road route over the two fixes' straight
    // chord, so cornering doesn't read as the vehicle cutting off-road -
    // only when both fixes actually sit close to that route.
    let routePath: RoutePoint[] | null = null;
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
      const time = Date.now();
      const progress = clamp((time - started) / duration, 0, 1);
      if (time - lastPaint >= 32 || progress === 1) {
        const eased = progress * progress * (3 - 2 * progress);
        const position = routePath
          ? interpolateAlongPath(routePath, eased)
          : {
              latitude: start.latitude + (target.latitude - start.latitude) * eased,
              longitude: start.longitude + (target.longitude - start.longitude) * eased,
            };
        const next = {
          latitude: position.latitude,
          longitude: position.longitude,
          heading: (start.heading + turn * eased + 360) % 360,
        };
        lastPaint = time;
        displayed.current = next;
        setLocation(next);
      }
      if (progress < 1) frame.current = requestAnimationFrame(animate);
      else {
        frame.current = null;
        setTrackingState("steady");
      }
    };
    frame.current = requestAnimationFrame(animate);
  }, [rawLatitude, rawLongitude, rawHeading, rawSpeed, rawAccuracy, rawRecordedAt, rawTimestamp, rawSequence]);

  return { location, trackingState, lastRejected };
}
