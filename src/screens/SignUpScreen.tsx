import React, { useState, useRef, useCallback } from 'react';
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
import { AnimatedButton, AnimatedInput, InlineFeedback } from '../components';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../lib/animations';
import type { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
};

export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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
        delay: 100,
        easing: ANIMATION.EASING.ENTER,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.ENTRANCE,
        delay: 100,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = useCallback(() => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  }, [email, password, confirmPassword]);

  const handleSignUp = useCallback(async () => {
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    const { error: signUpError } = await signUp(email, password);
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(true);
    }
  }, [email, password, validateForm, signUp]);

  const handleNavigateToSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successMessage}>
            Please check your email to confirm your account
          </Text>
          <AnimatedButton
            onPress={handleNavigateToSignIn}
            style={styles.successButton}
          >
            Go to Sign In
          </AnimatedButton>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>Join TOC</Text>
          <Text style={styles.subtitle}>Create your account</Text>
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
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <AnimatedInput
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
          />

          <AnimatedInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError(null);
            }}
            secureTextEntry
          />

          <AnimatedButton
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            size="large"
            style={styles.signUpButton}
          >
            Sign Up
          </AnimatedButton>

          <AnimatedButton
            variant="ghost"
            onPress={handleNavigateToSignIn}
            disabled={loading}
            style={styles.linkButton}
          >
            Already have an account? Sign In
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
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  title: {
    fontSize: 36,
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
  signUpButton: {
    marginTop: SPACING.SM,
  },
  linkButton: {
    marginTop: SPACING.MD,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  successIcon: {
    fontSize: 64,
    color: COLORS.SUCCESS,
    marginBottom: SPACING.MD,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.XL,
  },
  successButton: {
    minWidth: 200,
  },
});
