import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug log
console.log('Supabase init:', { url: supabaseUrl ? 'set' : 'empty', key: supabaseAnonKey ? 'set' : 'empty' });

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);