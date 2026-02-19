import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ANIMATION, COLORS, RADIUS } from '../lib/animations';

interface LoadingSkeletonProps {
  count?: number;
  style?: ViewStyle;
}

export function LoadingSkeleton({ count = 3, style }: LoadingSkeletonProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} index={index} />
      ))}
    </View>
  );
}

function SkeletonItem({ index }: { index: number }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 600,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
      ])
    );

    const entranceAnimation = Animated.timing(translateX, {
      toValue: 0,
      duration: ANIMATION.DURATION.ENTRANCE,
      delay: index * 50,
      easing: ANIMATION.EASING.ENTER,
      useNativeDriver: true,
    });

    shimmerAnimation.start();
    entranceAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [index, opacity, translateX]);

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonCircle} />
        <View style={styles.skeletonText} />
      </View>
      <View style={[styles.skeletonText, { width: '60%', marginTop: 8 }]} />
      <View style={[styles.skeletonText, { width: '40%', marginTop: 8 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: RADIUS.MD,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.SURFACE_HIGHLIGHT,
    marginRight: 16,
  },
  skeletonText: {
    height: 16,
    backgroundColor: COLORS.SURFACE_HIGHLIGHT,
    borderRadius: RADIUS.SM,
    width: '30%',
  },
});
