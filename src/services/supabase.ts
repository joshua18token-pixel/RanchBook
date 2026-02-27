import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with actual Supabase project credentials
const SUPABASE_URL = 'https://ucpytvwsjprshjzjwtqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcHl0dndzanByc2hqemp3dHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTMzNzUsImV4cCI6MjA4NzU2OTM3NX0.dV8hH4xS69hUhjhWL0k8eAZTkIp9WDH7t-TDsnXlKtE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: typeof window !== 'undefined',
  },
});
