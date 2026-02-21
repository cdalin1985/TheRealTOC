import React, { useRef, useCallback } from 'react';
import {
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { ANIMATION, COLORS, TYPOGRAPHY, TOUCH_TARGET, RADIUS } from '../lib/animations';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function AnimatedButton({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedButtonProps) {
  // Lazy initialization for React 19 compatibility
  const scaleRef = useRef<Animated.Value | null>(null);
  const opacityRef = useRef<Animated.Value | null>(null);
  
  if (!scaleRef.current) {
    scaleRef.current = new Animated.Value(1);
  }
  if (!opacityRef.current) {
    opacityRef.current = new Animated.Value(1);
  }
  
  const scale = scaleRef.current;
  const opacity = opacityRef.current;

  const handlePressIn = useCallback((e: any) => {
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
    onPressIn?.(e);
  }, [onPressIn, scale, opacity]);

  const handlePressOut = useCallback((e: any) => {
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
    onPressOut?.(e);
  }, [onPressOut, scale, opacity]);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: COLORS.PRIMARY,
        };
      case 'secondary':
        return {
          backgroundColor: COLORS.SURFACE,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.PRIMARY,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.ERROR,
        };
      default:
        return {};
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 12,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          minHeight: 56,
        };
      case 'medium':
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: TOUCH_TARGET.BUTTON_HEIGHT,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return COLORS.TEXT_PRIMARY;
      case 'secondary':
        return COLORS.TEXT_PRIMARY;
      case 'outline':
        return COLORS.PRIMARY;
      case 'ghost':
        return COLORS.PRIMARY;
      case 'danger':
        return COLORS.ERROR;
      default:
        return COLORS.TEXT_PRIMARY;
    }
  };

  const animatedStyle = {
    transform: [{ scale }],
    opacity: disabled ? ANIMATION.OPACITY.DISABLED : opacity,
  };

  return (
    <Animated.View style={[animatedStyle, { width: style?.width }] }>
      <TouchableOpacity
        {...props}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.button,
          getVariantStyle(),
          getSizeStyle(),
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : (
          <View style={styles.content}>
            {typeof children === 'string' ? (
              <Animated.Text
                style={[
                  styles.text,
                  { color: getTextColor() },
                  textStyle,
                ]}
              >
                {children}
              </Animated.Text>
            ) : (
              children
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...TYPOGRAPHY.BUTTON,
  },
});
