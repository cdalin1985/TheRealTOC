import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ANIMATION, COLORS, TYPOGRAPHY, RADIUS } from '../lib/animations';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackToastProps {
  visible: boolean;
  type: FeedbackType;
  message: string;
  onHide?: () => void;
  duration?: number;
  style?: ViewStyle;
}

const FEEDBACK_CONFIG: Record<FeedbackType, { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  success: {
    icon: 'checkmark-circle',
    color: COLORS.SUCCESS,
    bgColor: 'rgba(46, 204, 113, 0.15)',
  },
  error: {
    icon: 'close-circle',
    color: COLORS.ERROR,
    bgColor: 'rgba(231, 76, 60, 0.15)',
  },
  warning: {
    icon: 'warning',
    color: COLORS.WARNING,
    bgColor: 'rgba(241, 196, 15, 0.15)',
  },
  info: {
    icon: 'information-circle',
    color: COLORS.INFO,
    bgColor: 'rgba(52, 152, 219, 0.15)',
  },
};

export function FeedbackToast({
  visible,
  type,
  message,
  onHide,
  duration = 3000,
  style,
}: FeedbackToastProps) {
  // Lazy initialization for React 19 compatibility
  const translateYRef = useRef<Animated.Value | null>(null);
  const opacityRef = useRef<Animated.Value | null>(null);
  
  if (!translateYRef.current) {
    translateYRef.current = new Animated.Value(-100);
  }
  if (!opacityRef.current) {
    opacityRef.current = new Animated.Value(0);
  }
  
  const translateY = translateYRef.current;
  const opacity = opacityRef.current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
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
        Animated.timing(scale, {
          toValue: 1,
          duration: ANIMATION.DURATION.SLOW,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible, duration]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: ANIMATION.DURATION.NORMAL,
        easing: ANIMATION.EASING.EXIT,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION.DURATION.NORMAL,
        easing: ANIMATION.EASING.EXIT,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: ANIMATION.DURATION.NORMAL,
        easing: ANIMATION.EASING.EXIT,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const config = FEEDBACK_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          backgroundColor: config.bgColor,
          borderColor: config.color,
        },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={24} color={config.color} />
      <Text style={[styles.message, { color: config.color }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

interface InlineFeedbackProps {
  type: FeedbackType;
  message: string;
  style?: ViewStyle;
}

export function InlineFeedback({ type, message, style }: InlineFeedbackProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.NORMAL,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: ANIMATION.DURATION.NORMAL,
        easing: ANIMATION.EASING.ENTER,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateX]);

  const config = FEEDBACK_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.inlineContainer,
        {
          opacity,
          transform: [{ translateX }],
          backgroundColor: config.bgColor,
        },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={18} color={config.color} />
      <Text style={[styles.inlineMessage, { color: config.color }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    ...TYPOGRAPHY.BODY,
    marginLeft: 12,
    flex: 1,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.MD,
    marginVertical: 8,
  },
  inlineMessage: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginLeft: 8,
    flex: 1,
  },
});
