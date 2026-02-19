import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ScrollViewProps,
  ViewStyle,
  Animated,
} from 'react-native';
import { Header } from './Header';
import { LoadingSkeleton } from './LoadingSkeleton';
import { COLORS, ANIMATION } from '../lib/animations';

interface ScreenWrapperProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  headerStyle?: ViewStyle;
  refreshControl?: React.ReactElement;
}

export function ScreenWrapper({
  children,
  title,
  onBack,
  rightElement,
  loading = false,
  skeletonCount = 3,
  scrollable = true,
  contentContainerStyle,
  style,
  headerStyle,
  refreshControl,
}: ScreenWrapperProps) {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ANIMATION.DURATION.SLOW,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, contentOpacity, contentTranslateY]);

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton count={skeletonCount} />;
    }

    const animatedContent = (
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </Animated.View>
    );

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {animatedContent}
        </ScrollView>
      );
    }

    return animatedContent;
  };

  return (
    <View style={[styles.container, style]}>
      {title && (
        <Header
          title={title}
          onBack={onBack}
          rightElement={rightElement}
          style={headerStyle}
        />
      )}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
