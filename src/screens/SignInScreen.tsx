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
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignIn'>;
};

export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: ANIMATION.DURATION.SLOW,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: ANIMATION.DURATION.SLOW,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    }
  }, [email, password, signIn]);

  const handleNavigateToSignUp = useCallback(() => {
    navigation.navigate('SignUp');
  }, [navigation]);

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
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.title}>TOC</Text>
          <Text style={styles.subtitle}>The List</Text>
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
            <InlineFeedback type="error" message={error} style={styles.errorContainer} />
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
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
            autoComplete="password"
          />

          <AnimatedButton
            onPress={handleSignIn}
            loading={loading}
            disabled={loading}
            size="large"
            style={styles.signInButton}
          >
            Sign In
          </AnimatedButton>

          <AnimatedButton
            variant="ghost"
            onPress={handleNavigateToSignUp}
            disabled={loading}
            style={styles.linkButton}
          >
            Don't have an account? Sign Up
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    marginBottom: SPACING.MD,
  },
  signInButton: {
    marginTop: SPACING.SM,
  },
  linkButton: {
    marginTop: SPACING.MD,
  },
});
