import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Verificación simple para desarrollo
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: Faltan las variables de entorno SUPABASE en .env");
} else {
    console.log("Supabase: Conectando a " + supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);