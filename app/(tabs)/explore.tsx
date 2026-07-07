import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import {
  enviarNotificacionInmediata,
  programarNotificacionesDiarias,
} from '@/lib/notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';

/* Configuracion visual de cada modulo del menu principal */
interface ModuleConfig {
  title: string;
  sub: string;
  icon: any;
  route: string;
  accent: string;
  bg: string;
  adminOnly?: boolean;
  badgeKey?: 'vencimientos' | 'stockBajo';
}

const MODULES: ModuleConfig[] = [
  {
    title: 'Ingreso de Lotes',
    sub: 'Registrar mercaderia y fechas de caducidad',
    icon: 'add-circle',
    route: '/ingreso-lotes',
    accent: '#2563eb',
    bg: '#eff6ff',
  },
  {
    title: 'Consulta de Stock',
    sub: 'Ver existencias fisicas en tiempo real',
    icon: 'cube',
    route: '/consulta-stock',
    accent: '#0891b2',
    bg: '#ecfeff',
    badgeKey: 'stockBajo',
  },
  {
    title: 'Salidas y Descarte',
    sub: 'Registrar retiros o mermas de almacen',
    icon: 'exit',
    route: '/salidas-descarte',
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    title: 'Alertas de Vencimiento',
    sub: 'Revisar lotes proximos a caducar',
    icon: 'alert-circle',
    route: '/alertas-vencimiento',
    accent: '#dc2626',
    bg: '#fef2f2',
    adminOnly: true,
    badgeKey: 'vencimientos',
  },
  {
    title: 'Historial de Movimientos',
    sub: 'Auditoria completa de ingresos y salidas',
    icon: 'time',
    route: '/historial-movimientos',
    accent: '#0f766e',
    bg: '#f0fdfa',
    adminOnly: true,
  },
  {
    title: 'Gestion de Productos',
    sub: 'Administrar catalogos y marcas',
    icon: 'pricetags',
    route: '/gestion-productos',
    accent: '#ea580c',
    bg: '#ffedd5',
    adminOnly: true,
  },
  {
    title: 'Gestion de Usuarios',
    sub: 'Administrar accesos y roles del personal',
    icon: 'people',
    route: '/gestion-usuarios',
    accent: '#d97706',
    bg: '#fffbeb',
    adminOnly: true,
  },
  {
    title: 'Edicion de Lotes',
    sub: 'Corregir errores de ingreso',
    icon: 'create',
    route: '/edicion-lotes',
    accent: '#c026d3',
    bg: '#fdf4ff',
    adminOnly: true,
  },
];

/* Pantalla principal del dashboard con menu de modulos */
export default function DashboardScreen() {
  const { nombre, rol, logout } = useAuthStore();
  const router = useRouter();

  const [conteoVencimientos, setConteoVencimientos] = useState(0);
  const [conteoStockBajo, setConteoStockBajo] = useState(0);

  /* Consulta el estado del inventario y dispara notificaciones si aplica */
  const revisarEstadoInventario = async () => {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 15);
      const fechaStr = fechaLimite.toISOString().split('T')[0];

      const { count: vencidos } = await supabase
        .from('lotes')
        .select('*', { count: 'exact', head: true })
        .lte('fecha_vencimiento', fechaStr)
        .gt('cantidad', 0);

      setConteoVencimientos(vencidos || 0);

      const { count: bajoStock } = await supabase
        .from('lotes')
        .select('*', { count: 'exact', head: true })
        .lte('cantidad', 10)
        .gt('cantidad', 0);

      setConteoStockBajo(bajoStock || 0);

      if ((vencidos && vencidos > 0) || (bajoStock && bajoStock > 0)) {
        enviarNotificacionInmediata(
          'Atencion: Inventario Critico',
          `Tienes ${vencidos || 0} vencimientos y ${bajoStock || 0} productos con poco stock.`
        );
      }

      await programarNotificacionesDiarias(vencidos || 0, bajoStock || 0);
    } catch (error) {
      console.error('Error revisando inventario:', error);
    }
  };

  useEffect(() => {
    revisarEstadoInventario();
  }, []);

  const getBadge = (key?: 'vencimientos' | 'stockBajo') => {
    if (key === 'vencimientos') return conteoVencimientos;
    if (key === 'stockBajo') return conteoStockBajo;
    return 0;
  };

  const isAdmin = rol === 'Administrador';
  const visibleModules = MODULES.filter((m) => !m.adminOnly || isAdmin);

  /* Calcula el saludo segun la hora actual */
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? 'Buenos dias' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  /* Genera las iniciales del nombre para el avatar */
  const obtenerIniciales = (nombreCompleto: string | null): string => {
    if (!nombreCompleto) return '?';
    const palabras = nombreCompleto.trim().split(' ');
    if (palabras.length === 1) return palabras[0][0].toUpperCase();
    return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
  };

  const iniciales = obtenerIniciales(nombre);

  return (
    <View style={styles.container}>
      {/* ── HEADER DE PERFIL ── */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          {/* Avatar con iniciales */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>

          {/* Saludo y nombre */}
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerGreeting}>{saludo}</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {nombre || 'Invitado'}
            </Text>
          </View>

          {/* Pastilla de rol */}
          <View style={[styles.rolPill, isAdmin && styles.rolPillAdmin]}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'person'}
              size={12}
              color={isAdmin ? '#fbbf24' : '#93c5fd'}
            />
            <Text style={styles.rolPillText}>{rol || 'Sin Rol'}</Text>
          </View>
        </View>
      </View>

      {/* ── MODULOS ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Modulos</Text>

        {visibleModules.map((mod) => {
          const badge = getBadge(mod.badgeKey);
          return (
            <TouchableOpacity
              key={mod.route}
              style={styles.moduleCard}
              onPress={() => router.push(mod.route as any)}
              activeOpacity={0.75}
            >
              {/* Franja de color lateral */}
              <View style={[styles.accentBar, { backgroundColor: mod.accent }]} />

              {/* Icono */}
              <View style={[styles.iconBox, { backgroundColor: mod.bg }]}>
                <Ionicons name={mod.icon} size={26} color={mod.accent} />
              </View>

              {/* Texto */}
              <View style={styles.moduleText}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleSub}>{mod.sub}</Text>
              </View>

              {/* Badge */}
              {badge > 0 && (
                <View style={[styles.badge, { backgroundColor: mod.accent }]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}

              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          );
        })}

        {/* ── CERRAR SESION ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            logout();
            router.replace('/');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#ef4444"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.logoutText}>Cerrar Sesion</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  /* ── Header de perfil ─────────────────────────────────────────────────── */
  header: {
    backgroundColor: '#1d4ed8',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 10,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  /* Avatar circular con iniciales */
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Bloque de texto de saludo y nombre */
  headerTextBlock: {
    flex: 1,
  },
  headerGreeting: {
    color: '#bfdbfe',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  headerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  /* Pastilla de rol */
  rolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
  },
  rolPillAdmin: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderColor: 'rgba(251,191,36,0.35)',
  },
  rolPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* ── Scroll y seccion ─────────────────────────────────────────────────── */
  scrollContent: { padding: 18, paddingBottom: 30 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginTop: 10,
  },

  /* ── Tarjetas de modulo ───────────────────────────────────────────────── */
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 16,
  },
  moduleText: { flex: 1 },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  moduleSub: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginRight: 8,
    minWidth: 26,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  /* ── Boton de cerrar sesion ───────────────────────────────────────────── */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    elevation: 1,
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});