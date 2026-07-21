import {
  Image,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  View,
} from "react-native";

type Props = {
  source: ImageSourcePropType;
  heading?: number;
  size?: number;
  active?: boolean;
  fixedForward?: boolean;
  onImageReady?: () => void;
};

export default function VehicleMarker({
  source,
  heading = 0,
  size = 42,
  active = false,
  fixedForward = false,
  onImageReady,
}: Props) {
  const rotation = (fixedForward ? 0 : heading) - 90;

  return (
    <View
      style={[
        styles.container,
        active && styles.activeContainer,
        { width: size + 10, height: size + 10, borderRadius: (size + 10) / 2 },
      ]}
    >
      <Image
        source={source}
        resizeMode="contain"
        style={[
          styles.vehicle,
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

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#0B3D2E",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 4 },
    }),
  },
  vehicle: {
    tintColor: undefined,
  },
});


