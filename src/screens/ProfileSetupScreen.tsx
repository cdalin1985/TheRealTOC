import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
};

export function ProfileSetupScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateProfile, refreshProfile } = useAuth();

  const handleSave = async () => {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      Alert.alert('Error', 'Display name must be 30 characters or less');
      return;
    }

    setLoading(true);
    const { error } = await updateProfile({ display_name: trimmedName });
    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } else {
      refreshProfile();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Standings' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to TOC!</Text>
      <Text style={styles.subtitle}>Set up your player profile</Text>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        placeholderTextColor="#666"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={30}
        autoFocus
      />
      <Text style={styles.hint}>
        This is how other players will see you on The List
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    color: '#fff',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
