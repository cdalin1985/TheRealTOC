import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SignInScreen,
  SignUpScreen,
  ProfileSetupScreen,
  StandingsScreen,
  CreateChallengeScreen,
  MyChallengesScreen,
  MyMatchesScreen,
  MatchDetailScreen,
  TreasuryScreen,
  AdminTreasuryScreen,
} from './src/screens';
import { useAuth } from './src/hooks/useAuth';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { session, loading, needsProfileSetup } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setReady(true);
    }
  }, [loading]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1a1a2e' },
      }}
    >
      {!session ? (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : needsProfileSetup() ? (
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : (
        <>
          <Stack.Screen name="Standings" component={StandingsScreen} />
          <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} />
          <Stack.Screen name="MyChallenges" component={MyChallengesScreen} />
          <Stack.Screen name="MyMatches" component={MyMatchesScreen} />
          <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
          <Stack.Screen name="Treasury" component={TreasuryScreen} />
          <Stack.Screen name="AdminTreasury" component={AdminTreasuryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Navigation />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
});
