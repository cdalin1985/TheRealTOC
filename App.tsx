import React from 'react';
import { View, Text } from 'react-native';
import { supabase } from './src/lib/supabase';

export default function App() {
  console.log('Supabase:', supabase ? 'loaded' : 'not loaded');
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello World - Supabase Test</Text>
    </View>
  );
}