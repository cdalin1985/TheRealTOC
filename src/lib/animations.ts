import { Animated, Easing, Platform } from 'react-native';

// Animation Constants - Fast, purposeful animations
export const ANIMATION = {
  // Durations (ms)
  DURATION: {
    INSTANT: 100,
    FAST: 150,
    NORMAL: 200,
    SLOW: 300,
    ENTRANCE: 250,
  },
  
  // Easing functions - consistent feel
  EASING: {
    // Standard - most UI interactions
    STANDARD: Easing.out(Easing.cubic),
    // Enter - elements appearing
    ENTER: Easing.out(Easing.back(1.2)),
    // Exit - elements leaving
    EXIT: Easing.in(Easing.cubic),
    // Press - button feedback
    PRESS: Easing.out(Easing.quad),
    // Bounce - playful feedback
    BOUNCE: Easing.out(Easing.back(1.5)),
  },
  
  // Scale values
  SCALE: {
    PRESSED: 0.96,
    HOVER: 1.02,
    ENTRANCE: 0.95,
  },
  
  // Opacity values
  OPACITY: {
    PRESSED: 0.8,
    DISABLED: 0.5,
    HIDDEN: 0,
    VISIBLE: 1,
  },
};

// Color Constants - Ensure consistency across app
export const COLORS = {
  // Background
  BACKGROUND: '#1a1a2e',
  SURFACE: '#16213e',
  SURFACE_HIGHLIGHT: '#1f2b4d',
  
  // Primary
  PRIMARY: '#e94560',
  PRIMARY_DARK: '#c73a51',
  PRIMARY_LIGHT: '#f06b7f',
  
  // Text
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#888888',
  TEXT_TERTIARY: '#666666',
  TEXT_MUTED: '#444444',
  
  // Status
  SUCCESS: '#2ecc71',
  WARNING: '#f1c40f',
  ERROR: '#e74c3c',
  INFO: '#3498db',
  
  // Borders
  BORDER: '#2a2a4e',
  BORDER_LIGHT: '#3a3a5e',
};

// Typography - Consistent text styles
export const TYPOGRAPHY = {
  H1: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: COLORS.TEXT_PRIMARY,
  },
  H2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.TEXT_PRIMARY,
  },
  H3: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: COLORS.TEXT_PRIMARY,
  },
  H4: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.TEXT_PRIMARY,
  },
  BODY: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    color: COLORS.TEXT_PRIMARY,
  },
  BODY_SMALL: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: COLORS.TEXT_SECONDARY,
  },
  CAPTION: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    color: COLORS.TEXT_TERTIARY,
  },
  BUTTON: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.TEXT_PRIMARY,
  },
};

// Spacing - Consistent layout
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

// Touch targets - Accessibility (44x44pt minimum)
export const TOUCH_TARGET = {
  MIN_SIZE: 44,
  BUTTON_HEIGHT: 48,
  INPUT_HEIGHT: 56,
  NAV_BUTTON: 44,
};

// Border radius - Consistent rounding
export const RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  FULL: 9999,
};

// Shadow - Subtle depth
export const SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  android: {
    elevation: 4,
  },
});

// Hook for button press animation
export function usePressAnimation() {
  const scale = new Animated.Value(1);
  const opacity = new Animated.Value(1);

  const onPressIn = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: ANIMATION.SCALE.PRESSED,
        duration: ANIMATION.DURATION.FAST,
        easing: ANIMATION.EASING.PRESS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: ANIMATION.OPACITY.PRESSED,
        duration: ANIMATION.DURATION.FAST,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: ANIMATION.DURATION.FAST,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.FAST,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, opacity, onPressIn, onPressOut };
}

// Entrance animation for list items
export function createEntranceAnimation(index: number, totalItems: number = 10) {
  const translateY = new Animated.Value(20);
  const opacity = new Animated.Value(0);

  const delay = Math.min(index * 50, 300); // Cap delay at 300ms

  Animated.sequence([
    Animated.delay(delay),
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
    ]),
  ]).start();

  return { translateY, opacity };
}

// Stagger animation for multiple elements
export function createStaggerAnimation(itemCount: number) {
  const animations = Array.from({ length: itemCount }, () => ({
    translateY: new Animated.Value(20),
    opacity: new Animated.Value(0),
  }));

  const start = () => {
    const staggered = animations.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(50, staggered).start();
  };

  return { animations, start };
}

// Fade animation
export function createFadeAnimation(visible: boolean) {
  const opacity = new Animated.Value(visible ? 1 : 0);

  Animated.timing(opacity, {
    toValue: visible ? 1 : 0,
    duration: ANIMATION.DURATION.NORMAL,
    easing: ANIMATION.EASING.STANDARD,
    useNativeDriver: true,
  }).start();

  return { opacity };
}

// Screen transition animation config for React Navigation
export const screenTransitionConfig = {
  animation: 'timing' as const,
  config: {
    duration: ANIMATION.DURATION.SLOW,
    easing: ANIMATION.EASING.STANDARD,
  },
};

// Card animation style
export function getCardAnimationStyle(
  translateY: Animated.Value,
  opacity: Animated.Value,
  scale: Animated.Value = new Animated.Value(1)
) {
  return {
    transform: [{ translateY }, { scale }],
    opacity,
  };
}
