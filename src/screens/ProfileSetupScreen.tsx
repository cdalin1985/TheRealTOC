import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AnimatedButton } from '../components/AnimatedButton';
import { AnimatedInput } from '../components/AnimatedInput';
import { InlineFeedback } from '../components/FeedbackToast';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../lib/animations';
import type { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
};

export function ProfileSetupScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateProfile, refreshProfile } = useAuth();

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Progress bar animation
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: ANIMATION.DURATION.SLOW,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: false,
    }).start();

    // Content entrance
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.SLOW,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: ANIMATION.DURATION.SLOW,
        easing: ANIMATION.EASING.ENTER,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: ANIMATION.DURATION.ENTRANCE,
        delay: 150,
        easing: ANIMATION.EASING.ENTER,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.ENTRANCE,
        delay: 150,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progressWidth, headerOpacity, headerTranslateY, formTranslateY, formOpacity]);

  const handleSave = async () => {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setError('Please enter a display name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Display name must be 30 characters or less');
      return;
    }

    setError(null);
    setLoading(true);
    const { error: updateError } = await updateProfile({ display_name: trimmedName });
    setLoading(false);

    if (updateError) {
      setError('Failed to save profile. Please try again.');
    } else {
      refreshProfile();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Standings' }],
      });
    }
  };

  const progressBarWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progressBarWidth },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <Text style={styles.welcomeIcon}>🎱</Text>
          <Text style={styles.title}>Welcome to TOC!</Text>
          <Text style={styles.subtitle}>Set up your player profile</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {error && (
            <InlineFeedback type="error" message={error} style={styles.feedbackContainer} />
          )}

          <AnimatedInput
            label="Display Name"
            placeholder="Enter your name"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setError(null);
            }}
            maxLength={30}
            autoFocus
            icon="person-outline"
          />

          <Text style={styles.hint}>
            This is how other players will see you on The List
          </Text>

          <AnimatedButton
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            size="large"
            style={styles.continueButton}
          >
            Continue
          </AnimatedButton>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.LG,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.SURFACE,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: SPACING.MD,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  formContainer: {
    width: '100%',
  },
  feedbackContainer: {
    marginBottom: SPACING.MD,
  },
  hint: {
    fontSize: 14,
    color: COLORS.TEXT_TERTIARY,
    marginTop: -SPACING.SM,
    marginBottom: SPACING.LG,
  },
  continueButton: {
    marginTop: SPACING.SM,
  },
});
