import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { ANIMATION, COLORS, TYPOGRAPHY, RADIUS } from '../lib/animations';

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

interface FullScreenLoaderProps {
  message?: string;
}

export function FullScreenLoader({ message = 'Loading...' }: FullScreenLoaderProps) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: ANIMATION.DURATION.SLOW,
        easing: ANIMATION.EASING.ENTER,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.SLOW,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.fullScreenContainer,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.loaderCard}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loaderText}>{message}</Text>
      </View>
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
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loaderCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: RADIUS.LG,
    padding: 32,
    alignItems: 'center',
    minWidth: 160,
  },
  loaderText: {
    ...TYPOGRAPHY.BODY,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },
});
