import { useEffect, useRef, useState } from "react";

const EARTH_RADIUS_METERS = 6371000;
const MAX_ACCURACY_METERS = 100;
const MAX_PLAUSIBLE_SPEED_MPS = 60;
const SNAP_AFTER_MS = 20000;
const STALE_AFTER_MS = 30000;

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

export function useSmoothLocation(rawLocation) {
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
      setLastRejected(reason);
      setTrackingState("rejected");
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
      setLocation(first);
      setLastRejected(null);
      setTrackingState("snapped");
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
      setLocation(firstGpsFix);
      setLastRejected(null);
      setTrackingState("snapped");
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
      setLastRejected(null);
      setTrackingState("steady");
      return;
    }

    const rawHeading =
      Number.isFinite(sample.heading) && sample.heading >= 0 && sample.speed >= 1.5
        ? sample.heading % 360
        : distance >= 4
          ? bearingBetween(previous, sample)
          : previous.heading;
    const target = {
      latitude: previous.latitude + (sample.latitude - previous.latitude) * 0.75,
      longitude: previous.longitude + (sample.longitude - previous.longitude) * 0.75,
      heading: (previous.heading + shortestHeadingDelta(previous.heading, rawHeading) + 360) % 360,
    };
    acceptedRef.current = { ...sample, ...target };

    if (receiveGapMs >= SNAP_AFTER_MS) {
      displayedRef.current = target;
      setLocation(target);
      setLastRejected(null);
      setTrackingState("snapped");
      return;
    }

    const start = displayedRef.current;
    const headingDelta = shortestHeadingDelta(start.heading, target.heading);
    const duration = clamp(sampleDeltaMs * 0.9, 800, 4500);
    const startedAt = Date.now();
    let lastPaintAt = 0;
    setLastRejected(null);
    setTrackingState("animating");

    const animate = () => {
      const now = Date.now();
      const progress = clamp((now - startedAt) / duration, 0, 1);
      if (now - lastPaintAt >= 32 || progress === 1) {
        const eased = easeInOut(progress);
        const next = {
          latitude: start.latitude + (target.latitude - start.latitude) * eased,
          longitude: start.longitude + (target.longitude - start.longitude) * eased,
          heading: (start.heading + headingDelta * eased + 360) % 360,
        };
        lastPaintAt = now;
        displayedRef.current = next;
        setLocation(next);
      }
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setTrackingState("steady");
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
