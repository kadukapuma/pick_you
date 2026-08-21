import { useRouter } from "expo-router";
import { Linking, ScrollView } from "react-native";
import { usePromotions } from "../../../hooks/usePromotions";
import type { Promotion } from "../../../services/promotions/promotionTypes";
import PromotionCard from "./PromotionCard";

type PromotionCarouselProps = {
  compact?: boolean;
  /** Exact content width of the screen's padded container, so the card lines up flush with every other section. */
  containerWidth: number;
};

export default function PromotionCarousel({ compact = false, containerWidth }: PromotionCarouselProps) {
  const router = useRouter();
  const { promotions } = usePromotions();

  const cardWidth = containerWidth;

  const handlePress = (item: Promotion) => {
    if (!item.actionUrl) return;
    if (/^https?:\/\//i.test(item.actionUrl)) {
      Linking.openURL(item.actionUrl);
    } else {
      router.push(item.actionUrl as any);
    }
  };

  if (promotions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={cardWidth + 12}
      snapToAlignment="start"
      contentContainerStyle={{ gap: 12 }}
    >
      {promotions.map((item) => (
        <PromotionCard
          key={item.id}
          item={item}
          compact={compact}
          width={cardWidth}
          onPress={() => handlePress(item)}
        />
      ))}
    </ScrollView>
  );
}
