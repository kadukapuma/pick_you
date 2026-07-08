import { MaterialCommunityIcons } from "@expo/vector-icons";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSmoothLocation } from "../../hooks/useSmoothLocation";

const isValidCoordinate = (coordinate) =>
  Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

const toLatLng = (coordinate) => ({
  latitude: coordinate.latitude,
  longitude: coordinate.longitude,
});

const CAMERA_UPDATE_INTERVAL_MS = 250;
const FOLLOW_CAMERA_ANIMATION_MS = 350;
const DEFAULT_DELTA = 0.04;

const useFollowCameraLocation = (location, enabled) => {
  const [cameraLocation, setCameraLocation] = useState(location);
  const lastUpdateRef = useRef(0);
  const timeoutRef = useRef(null);
  const latestLocationRef = useRef(location);

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
      setCameraLocation(location);
      return;
    }

    latestLocationRef.current = location;
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    const publish = () => {
      lastUpdateRef.current = Date.now();
      timeoutRef.current = null;
      setCameraLocation(latestLocationRef.current);
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
  }, [enabled, location]);

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
  size = 76,
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
              transform: [{ rotate: `${visualHeading - 90}deg` }],
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
    routeColor = "#00A859",
    destinationColor = "#00A859",
    vehicleImage,
    vehicleHeading = 0,
    vehicleSize = 10,
    edgePadding,
    style,
    cameraRef,
    followVehicle = false,
    followZoom = 16,
    followPitch = 45,
    onFollowStateChange,
  },
  forwardedRef,
) {
  const mapRef = useRef(null);
  const hasFitInitialBounds = useRef(false);
  const [tracksVehicleMarkerChanges, setTracksVehicleMarkerChanges] = useState(true);
  const { location: smoothOrigin } = useSmoothLocation(origin);
  const renderedOrigin = smoothOrigin ?? origin;
  const cameraOrigin = useFollowCameraLocation(renderedOrigin, followVehicle);
  const cameraIsFree = Boolean(onFollowStateChange) && !followVehicle;
  const visibleCoordinates = useMemo(
    () => [renderedOrigin, destination, ...routeCoordinates].filter(isValidCoordinate).map(toLatLng),
    [destination, renderedOrigin, routeCoordinates],
  );
  const routeLine = useMemo(() => {
    const lineCoordinates =
      routeCoordinates.length > 1
        ? routeCoordinates
        : destination
          ? [renderedOrigin, destination]
          : [];

    return lineCoordinates.filter(isValidCoordinate).map(toLatLng);
  }, [destination, renderedOrigin, routeCoordinates]);

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
  }, [vehicleImage]);

  useEffect(() => {
    if (followVehicle || cameraIsFree || visibleCoordinates.length < 2) return;

    const timeout = setTimeout(() => {
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
    }, hasFitInitialBounds.current ? 0 : 500);

    return () => clearTimeout(timeout);
  }, [cameraIsFree, edgePadding, followVehicle, visibleCoordinates]);

  useEffect(() => {
    const next = cameraOrigin ?? renderedOrigin;
    if (!followVehicle || !next) return;

    mapRef.current?.animateCamera(
      {
        center: toLatLng(next),
        heading: next.heading ?? vehicleHeading ?? 0,
        pitch: followPitch,
        zoom: followZoom,
      },
      { duration: FOLLOW_CAMERA_ANIMATION_MS },
    );
  }, [cameraOrigin, followPitch, followVehicle, followZoom, renderedOrigin, vehicleHeading]);

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
      showsMyLocationButton={false}
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
          onImageReady={() => setTracksVehicleMarkerChanges(false)}
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

export default GoogleRideMap;

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
