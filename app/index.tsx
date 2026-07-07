import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!nombreUsuario || !password) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, rol')
        .eq('nombre_usuario', nombreUsuario.trim())
        .eq('password', password.trim())
        .eq('activo', true)
        .single();

      if (error || !data) {
        console.log("Error Supabase:", error);
        alert("Login fallido. Usuario o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      login(data.id, data.nombre, data.rol);
      router.replace('/explore');

    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?q=80&w=1000' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', '#f8fafc', '#e2e8f0']}
          locations={[0, 0.4, 1]}
          style={styles.gradientOverlay}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>

              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/images/logo.png')}
                  style={{ width: 280, height: 180, marginBottom: 5 }}
                  resizeMode="contain"
                />
                <ThemedText style={styles.subtitle}>Sistema de Gestión de Inventario{'\n'}Iquitos, Perú</ThemedText>
              </View>

              <View style={styles.formContainer}>
                <ThemedText style={styles.label}>Usuario:</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Usuario"
                  placeholderTextColor="#94a3b8"
                  value={nombreUsuario}
                  onChangeText={setNombreUsuario}
                  autoCapitalize="none"
                />

                <ThemedText style={styles.label}>Contraseña:</ThemedText>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="****"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <MaterialCommunityIcons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ['#94a3b8', '#94a3b8'] : ['#ec4899', '#a855f7']}
                    style={styles.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <ThemedText style={styles.buttonText}>
                      {loading ? "Cargando..." : "Ingresar"}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: height * 0.45,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: height * 0.1,
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoWrapper: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 16,
  },
  logoBackground: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSS: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  logoImage: {
    width: 200,
    height: 80,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 26,
    color: '#3f3f46',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 30,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeIcon: {
    padding: 14,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});