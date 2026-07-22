import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  source?: ImageSourcePropType;
  heading?: number;
  size?: number;
  active?: boolean;
  fixedForward?: boolean;
  onImageReady?: () => void;
};

export default function VehicleMarker({
  source,
  heading = 0,
  size = 46,
  active = false,
  fixedForward = false,
  onImageReady,
}: Props) {
  const rotation = fixedForward ? 0 : heading;

  if (source) {
    return (
      <View style={[styles.vehicleImageFrame, { width: size, height: size }]}>
        <Image
          source={source}
          resizeMode="contain"
          style={[
            styles.vehicleImage,
            {
              width: size,
              height: size,
              transform: [{ rotate: `${rotation}deg` }],
            },
          ]}
          onLoadEnd={onImageReady}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.navigationMarker,
        { transform: [{ rotate: `${rotation}deg` }] },
      ]}
    >
      <MaterialCommunityIcons name="navigation" size={22} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
