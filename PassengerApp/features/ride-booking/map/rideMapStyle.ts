import type { MapStyleElement } from "react-native-maps";

export const PASSENGER_LIGHT_MAP_STYLE: MapStyleElement[] = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#F3F6F5" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#E8EEEB" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#DDE8E2" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#CDE8F1" }],
  },
];
