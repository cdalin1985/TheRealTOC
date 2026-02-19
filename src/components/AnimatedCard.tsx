import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ANIMATION, COLORS, RADIUS } from '../lib/animations';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  index?: number;
  delay?: number;
}

export function AnimatedCard({
  children,
  style,
  index = 0,
  delay = 0,
}: AnimatedCardProps) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const itemDelay = Math.min(index * 50 + delay, 400);

    Animated.sequence([
      Animated.delay(itemDelay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [index, delay, translateY, opacity, scale]);

  const animatedStyle = {
    transform: [
      { translateY },
      { scale },
    ],
    opacity,
  };

  return (
    <Animated.View style={[styles.card, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 800,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeleton, { opacity }, style]} >
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: RADIUS.MD,
    padding: 16,
    marginBottom: 12,
  },
  skeleton: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: RADIUS.MD,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: COLORS.SURFACE_HIGHLIGHT,
    borderRadius: RADIUS.SM,
    width: '40%',
  },
});
