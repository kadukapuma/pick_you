import { MaterialCommunityIcons } from "@expo/vector-icons";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSmoothLocation } from "../../hooks/useSmoothLocation";

const isValidCoordinate = (coordinate) =>
  Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

const toLatLng = (coordinate) => ({
  latitude: coordinate.latitude,
  longitude: coordinate.longitude,
});

const isSameLatLng = (first, second) =>
  Math.abs(first.latitude - second.latitude) < 0.000001 &&
  Math.abs(first.longitude - second.longitude) < 0.000001;

const distanceMeters = (first, second) => {
  if (!isValidCoordinate(first) || !isValidCoordinate(second)) return Infinity;

  const latScale = 111320;
  const lngScale =
    latScale * Math.cos(((first.latitude + second.latitude) / 2) * Math.PI / 180);

  return Math.hypot(
    (second.latitude - first.latitude) * latScale,
    (second.longitude - first.longitude) * lngScale,
  );
};

const toUniqueLatLngs = (coordinates) =>
  coordinates.reduce((uniqueCoordinates, coordinate) => {
    if (!uniqueCoordinates.some((item) => isSameLatLng(item, coordinate))) {
      uniqueCoordinates.push(coordinate);
    }
    return uniqueCoordinates;
  }, []);

const CAMERA_UPDATE_INTERVAL_MS = 1000;
const FOLLOW_CAMERA_ANIMATION_MS = 700;
const CAMERA_MIN_MOVE_METERS = 6;
const DEFAULT_DELTA = 0.04;

const useFollowCameraLocation = (location, enabled) => {
  const [cameraLocation, setCameraLocation] = useState(location);
  const lastUpdateRef = useRef(0);
  const timeoutRef = useRef(null);
  const latestLocationRef = useRef(location);
  const cameraLocationRef = useRef(location);

  const updateCamera = useCallback((loc) => {
    const prev = cameraLocationRef.current;
    if (
      prev === loc ||
      (prev && loc && distanceMeters(prev, loc) < CAMERA_MIN_MOVE_METERS)
    ) {
      return;
    }
    cameraLocationRef.current = loc;
    setCameraLocation(loc);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !location) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      latestLocationRef.current = location;
      updateCamera(location);
      return;
    }

    latestLocationRef.current = location;
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    const publish = () => {
      lastUpdateRef.current = Date.now();
      timeoutRef.current = null;
      updateCamera(latestLocationRef.current);
    };

    if (elapsed >= CAMERA_UPDATE_INTERVAL_MS) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      publish();
      return;
    }

    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(
        publish,
        CAMERA_UPDATE_INTERVAL_MS - elapsed,
      );
    }
  }, [enabled, location, updateCamera]);

  return cameraLocation;
};

function DotMarker({ color = "#00A859" }) {
  return (
    <View style={[styles.dotOuter, { backgroundColor: `${color}33` }]}>
      <View style={[styles.dotInner, { backgroundColor: color }]} />
    </View>
  );
}

function VehicleMarker({
  source,
  heading = 0,
  size = 46,
  fixedForward = false,
  onImageReady,
}) {
  const visualHeading = fixedForward ? 0 : heading;

  if (source) {
    return (
      <View style={[styles.vehicleImageFrame, { width: size, height: size }]}>
        <Image
          source={source}
          style={[
            styles.vehicleImage,
            {
              width: size,
              height: size,
              transform: [{ rotate: `${visualHeading}deg` }],
            },
          ]}
          resizeMode="contain"
          onLoadEnd={onImageReady}
        />
      </View>
    );
  }

  return (
    <View style={[styles.navigationMarker, { transform: [{ rotate: `${visualHeading}deg` }] }]}>
      <MaterialCommunityIcons name="navigation" size={20} color="#FFFFFF" />
    </View>
  );
}

const GoogleRideMap = forwardRef(function GoogleRideMap(
  {
    origin,
    destination,
    routeCoordinates = [],
    showRoute = true,
    routeColor = "#00A859",
    destinationColor = "#00A859",
    vehicleImage,
    vehicleHeading = 0,
    vehicleSize = 46,
    edgePadding,
    style,
    cameraRef,
    followVehicle = false,
    followZoom = 16,
    followPitch = 0,
    onFollowStateChange,
  },
  forwardedRef,
) {
  const mapRef = useRef(null);
  const hasFitInitialBounds = useRef(false);
  const lastAnimatedCameraRef = useRef(null);
  const markerTrackingTimeoutRef = useRef(null);
  const [tracksVehicleMarkerChanges, setTracksVehicleMarkerChanges] = useState(true);
  const { location: smoothOrigin } = useSmoothLocation(origin);
  const renderedOrigin = useMemo(
    () => smoothOrigin ?? origin,
    [smoothOrigin, origin],
  );
  const cameraOrigin = useFollowCameraLocation(renderedOrigin, followVehicle);
  const cameraIsFree = Boolean(onFollowStateChange) && !followVehicle;

  // Use primitive values for stable dependency tracking
  const renderedLat = renderedOrigin?.latitude;
  const renderedLng = renderedOrigin?.longitude;
  const destLat = destination?.latitude;
  const destLng = destination?.longitude;
  const routeCoordsLen = routeCoordinates.length;

  const visibleCoordinates = useMemo(
    () =>
      toUniqueLatLngs(
        [renderedOrigin, destination, ...routeCoordinates]
          .filter(isValidCoordinate)
          .map(toLatLng),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renderedLat, renderedLng, destLat, destLng, routeCoordsLen],
  );
  const routeLine = useMemo(() => {
    if (!showRoute) return [];

    const lineCoordinates =
      routeCoordinates.length > 1
        ? routeCoordinates
        : destination
          ? [renderedOrigin, destination]
          : [];

    return lineCoordinates.filter(isValidCoordinate).map(toLatLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedLat, renderedLng, destLat, destLng, routeCoordsLen, showRoute]);

  const cameraHandle = useMemo(
    () => ({
      setCamera: (camera = {}) => {
        const centerCoordinate = camera.centerCoordinate;
        const center = Array.isArray(centerCoordinate)
          ? { latitude: centerCoordinate[1], longitude: centerCoordinate[0] }
          : camera.center || (isValidCoordinate(centerCoordinate) ? centerCoordinate : undefined);

        mapRef.current?.animateCamera(
          {
            center,
            heading: camera.heading ?? 0,
            pitch: camera.pitch ?? 0,
            zoom: camera.zoomLevel ?? camera.zoom,
          },
          { duration: camera.animationDuration ?? 350 },
        );
      },
    }),
    [],
  );

  useImperativeHandle(forwardedRef, () => cameraHandle, [cameraHandle]);

  useEffect(() => {
    if (cameraRef) cameraRef.current = cameraHandle;
  }, [cameraHandle, cameraRef]);

  useEffect(() => {
    setTracksVehicleMarkerChanges(Boolean(vehicleImage));
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
      markerTrackingTimeoutRef.current = null;
    }
  }, [vehicleImage]);

  useEffect(() => {
    return () => {
      if (markerTrackingTimeoutRef.current) {
        clearTimeout(markerTrackingTimeoutRef.current);
      }
    };
  }, []);

  const handleVehicleImageReady = useCallback(() => {
    if (!vehicleImage) return;
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
    }
    markerTrackingTimeoutRef.current = setTimeout(
      () => setTracksVehicleMarkerChanges(false),
      Platform.OS === "android" ? 700 : 150,
    );
  }, [vehicleImage]);

  useEffect(() => {
    if (followVehicle || cameraIsFree || visibleCoordinates.length < 1) return;
    if (hasFitInitialBounds.current) return;

    const timeout = setTimeout(() => {
      if (visibleCoordinates.length === 1) {
        mapRef.current?.animateCamera(
          {
            center: visibleCoordinates[0],
            heading: 0,
            pitch: 0,
            zoom: followZoom,
          },
          { duration: 600 },
        );
        hasFitInitialBounds.current = true;
        return;
      }

      mapRef.current?.fitToCoordinates(visibleCoordinates, {
        edgePadding: {
          top: edgePadding?.top ?? 140,
          right: edgePadding?.right ?? 70,
          bottom: edgePadding?.bottom ?? 260,
          left: edgePadding?.left ?? 70,
        },
        animated: true,
      });
      hasFitInitialBounds.current = true;
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraIsFree, followVehicle, followZoom, destLat, destLng, routeCoordsLen]);

  const cameraLat = cameraOrigin?.latitude;
  const cameraLng = cameraOrigin?.longitude;

  useEffect(() => {
    const next = cameraOrigin ?? renderedOrigin;
    if (!followVehicle || !next) return;

    const center = toLatLng(next);
    const last = lastAnimatedCameraRef.current;
    if (last && distanceMeters(last, center) < CAMERA_MIN_MOVE_METERS) return;
    lastAnimatedCameraRef.current = center;

    mapRef.current?.animateCamera(
      {
        center,
        heading: 0,
        pitch: followVehicle ? followPitch : 0,
        zoom: followZoom,
      },
      { duration: FOLLOW_CAMERA_ANIMATION_MS },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraLat, cameraLng, followPitch, followVehicle, followZoom]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      initialRegion={{
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      }}
      showsCompass={false}
      showsBuildings
      showsMyLocationButton={false}
      pitchEnabled={followPitch > 0}
      rotateEnabled={followPitch > 0}
      onPanDrag={() => {
        if (followVehicle) onFollowStateChange?.(false);
      }}
    >
      {routeLine.length > 1 ? (
        <Polyline
          coordinates={routeLine}
          strokeColor={routeColor}
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
      ) : null}

      <Marker
        coordinate={toLatLng(renderedOrigin)}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={vehicleImage ? tracksVehicleMarkerChanges : false}
      >
        <VehicleMarker
          source={vehicleImage}
          heading={renderedOrigin.heading ?? vehicleHeading}
          size={vehicleSize}
          fixedForward={followVehicle}
          onImageReady={handleVehicleImageReady}
        />
      </Marker>

      {destination ? (
        <Marker coordinate={toLatLng(destination)} anchor={{ x: 0.5, y: 0.5 }}>
          <DotMarker color={destinationColor} />
        </Marker>
      ) : null}
    </MapView>
  );
});

export default memo(GoogleRideMap);

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  dotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  vehicleImageFrame: {
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleImage: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  navigationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2F80ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
