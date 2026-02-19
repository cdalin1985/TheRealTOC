import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ANIMATION, COLORS, TYPOGRAPHY, RADIUS, TOUCH_TARGET } from '../lib/animations';

interface AnimatedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export function AnimatedInput({
  label,
  error,
  icon,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const borderColor = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = React.useState(false);

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
  }, [translateY, opacity]);

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
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: borderColorInterpolation,
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? COLORS.PRIMARY : COLORS.TEXT_TERTIARY}
            style={styles.icon}
          />
        )}
        <TextInput
          {...props}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            style,
          ]}
          placeholderTextColor={COLORS.TEXT_TERTIARY}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
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
  icon: {
    marginLeft: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: TOUCH_TARGET.INPUT_HEIGHT,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  error: {
    ...TYPOGRAPHY.CAPTION,
    color: COLORS.ERROR,
    marginTop: 4,
  },
});
