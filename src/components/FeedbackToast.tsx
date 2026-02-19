import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ANIMATION, COLORS, TYPOGRAPHY, RADIUS } from '../lib/animations';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

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

  const config = {
    success: { bgColor: 'rgba(46, 204, 113, 0.15)', color: COLORS.SUCCESS },
    error: { bgColor: 'rgba(231, 76, 60, 0.15)', color: COLORS.ERROR },
    warning: { bgColor: 'rgba(241, 196, 15, 0.15)', color: COLORS.WARNING },
    info: { bgColor: 'rgba(52, 152, 219, 0.15)', color: COLORS.INFO },
  }[type];

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
      <Text style={[styles.inlineMessage, { color: config.color }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.MD,
    marginVertical: 8,
  },
  inlineMessage: {
    ...TYPOGRAPHY.BODY_SMALL,
    flex: 1,
  },
});
