import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

type FiltroTipo = 'Todos' | 'Ingreso' | 'Salida';

const FILTROS: FiltroTipo[] = ['Todos', 'Ingreso', 'Salida'];

export default function HistorialMovimientosScreen() {
    const router = useRouter();
    const { rol } = useAuthStore();
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('Todos');

    const fetchMovimientos = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('movimientos')
                .select('*, lotes(numero_lote, productos(nombre)), perfiles(nombre)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMovimientos(data || []);
        } catch (error: any) {
            console.error('Error al cargar movimientos:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (rol !== 'Administrador') {
            router.replace('/');
        } else {
            fetchMovimientos();
        }
    }, [rol, fetchMovimientos]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderItem = ({ item }: { item: any }) => {
        const isIngreso = item.tipo_movimiento === 'Ingreso';
        const accentColor = isIngreso ? '#10b981' : '#ef4444';

        return (
            <View style={styles.card}>
                <View style={[styles.cardHeader, { borderBottomColor: accentColor + '33' }]}>
                    <View style={styles.typeBox}>
                        <View style={[styles.typeIconBg, { backgroundColor: accentColor + '1A' }]}>
                            <Ionicons
                                name={isIngreso ? 'arrow-down-circle' : 'arrow-up-circle'}
                                size={20}
                                color={accentColor}
                            />
                        </View>
                        <Text style={[styles.typeText, { color: accentColor }]}>
                            {item.tipo_movimiento}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.productName}>
                        {item.lotes?.productos?.nombre || 'Producto Desconocido'}
                    </Text>
                    <Text style={styles.detailText}>Lote: {item.lotes?.numero_lote || 'N/A'}</Text>

                    <View style={styles.row}>
                        <Text style={styles.detailText}>Motivo: {item.motivo}</Text>
                        <View style={[styles.quantityBadge, { backgroundColor: accentColor + '1A' }]}>
                            <Text style={[styles.quantityText, { color: accentColor }]}>
                                {isIngreso ? '+' : '-'}{item.cantidad}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.userBox}>
                        <Ionicons name="person" size={14} color="#64748b" />
                        <Text style={styles.userText}>{item.perfiles?.nombre || 'Desconocido'}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (rol !== 'Administrador') return null;

    const movimientosFiltrados = filtroTipo === 'Todos'
        ? movimientos
        : movimientos.filter(item => item.tipo_movimiento === filtroTipo);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Historial de Movimientos</ThemedText>
            </View>

            {/* Filtros como chips táctiles */}
            <View style={styles.filterRow}>
                {FILTROS.map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.chip, filtroTipo === f && styles.chipActive]}
                        onPress={() => setFiltroTipo(f)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, filtroTipo === f && styles.chipTextActive]}>
                            {f === 'Todos' ? 'Todos' : f === 'Ingreso' ? '↓ Ingresos' : '↑ Salidas'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Contador de resultados */}
            <View style={styles.countRow}>
                <Text style={styles.countText}>
                    {movimientosFiltrados.length} registro{movimientosFiltrados.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={movimientosFiltrados}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No hay movimientos registrados.</Text>
                        </View>
                    }
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { marginRight: 15 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

    // Chips de filtro
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 15,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    chip: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    chipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    chipText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 13,
    },
    chipTextActive: {
        color: '#fff',
    },

    countRow: {
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    countText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '500',
    },

    // Cards
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
    },
    typeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeIconBg: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    dateText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    cardBody: {
        padding: 15,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 8,
    },
    quantityBadge: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    quantityText: {
        fontSize: 15,
        fontWeight: '900',
    },
    userBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    userText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },

    // Estado vacío
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 15,
    },
});
