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

type Accepted = RawLocation & SmoothCoordinate & { recordedAt: number; receivedAt: number };

export function useSmoothLocation(raw?: RawLocation | null) {
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

  useEffect(() => () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
  }, []);

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

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return reject("invalid-coordinate");
    if (rawRecordedAt && now - sample.recordedAt > 30000) return reject("stale");
    if (Number.isFinite(Number(rawAccuracy)) && Number(rawAccuracy) > 100) return reject("low-accuracy");
    if (previous && Number.isFinite(Number(rawSequence)) && Number(rawSequence) <= Number(previous.sequence)) return reject("out-of-order");
    if (frame.current != null) cancelAnimationFrame(frame.current);

    if (!previous || !displayed.current) {
      const first = { latitude, longitude, heading: Number.isFinite(sample.heading) ? sample.heading : 0 };
      accepted.current = { ...sample, ...first };
      displayed.current = first;
      setLocation(first);
      setLastRejected(null);
      setTrackingState("snapped");
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
    const animate = () => {
      const time = Date.now();
      const progress = clamp((time - started) / duration, 0, 1);
      if (time - lastPaint >= 32 || progress === 1) {
        const eased = progress * progress * (3 - 2 * progress);
        const next = {
          latitude: start.latitude + (target.latitude - start.latitude) * eased,
          longitude: start.longitude + (target.longitude - start.longitude) * eased,
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
