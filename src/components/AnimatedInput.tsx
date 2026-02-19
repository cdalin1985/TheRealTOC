import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ANIMATION, COLORS, TYPOGRAPHY, RADIUS, TOUCH_TARGET } from '../lib/animations';

interface AnimatedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function AnimatedInput({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const borderColor = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
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
    ]).start();
  }, []);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderColor, {
      toValue: 1,
      duration: ANIMATION.DURATION.FAST,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderColor, {
      toValue: 0,
      duration: ANIMATION.DURATION.FAST,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  const borderColorInterpolation = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.SURFACE, COLORS.PRIMARY],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
        containerStyle,
      ]}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: borderColorInterpolation,
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        <TextInput
          {...props}
          style={[styles.input, style as TextStyle]}
          placeholderTextColor={COLORS.TEXT_TERTIARY}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </Animated.View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginBottom: 8,
    color: COLORS.TEXT_SECONDARY,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: RADIUS.MD,
    minHeight: TOUCH_TARGET.INPUT_HEIGHT,
  },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: TOUCH_TARGET.INPUT_HEIGHT,
  },
  error: {
    ...TYPOGRAPHY.CAPTION,
    color: COLORS.ERROR,
    marginTop: 4,
  },
});
