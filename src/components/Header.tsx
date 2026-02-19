import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ANIMATION, COLORS, TYPOGRAPHY, RADIUS, TOUCH_TARGET } from '../lib/animations';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export function Header({ title, onBack, rightElement, style }: HeaderProps) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <View style={styles.leftSection}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightSection}>
        {rightElement || <View style={styles.backButtonPlaceholder} />}
      </View>
    </Animated.View>
  );
}

interface NavButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function NavButton({
  label,
  onPress,
  variant = 'secondary',
  icon,
  style,
}: NavButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: ANIMATION.SCALE.PRESSED,
      duration: ANIMATION.DURATION.FAST,
      easing: ANIMATION.EASING.PRESS,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: ANIMATION.DURATION.FAST,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: true,
    }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.navButton,
          isPrimary ? styles.navButtonPrimary : styles.navButtonSecondary,
        ]}
        activeOpacity={1}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={isPrimary ? COLORS.TEXT_PRIMARY : COLORS.TEXT_PRIMARY}
            style={styles.navButtonIcon}
          />
        )}
        <Text
          style={[
            styles.navButtonText,
            isPrimary && styles.navButtonTextPrimary,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.BACKGROUND,
  },
  leftSection: {
    width: 50,
    alignItems: 'flex-start',
  },
  rightSection: {
    width: 50,
    alignItems: 'flex-end',
  },
  backButton: {
    width: TOUCH_TARGET.NAV_BUTTON,
    height: TOUCH_TARGET.NAV_BUTTON,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.SM,
  },
  backButtonPlaceholder: {
    width: TOUCH_TARGET.NAV_BUTTON,
    height: TOUCH_TARGET.NAV_BUTTON,
  },
  title: {
    ...TYPOGRAPHY.H3,
    flex: 1,
    textAlign: 'center',
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: TOUCH_TARGET.BUTTON_HEIGHT,
  },
  navButtonPrimary: {
    backgroundColor: COLORS.PRIMARY,
  },
  navButtonSecondary: {
    backgroundColor: COLORS.SURFACE,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  navButtonTextPrimary: {
    color: COLORS.TEXT_PRIMARY,
  },
  navButtonIcon: {
    marginRight: 6,
  },
});
