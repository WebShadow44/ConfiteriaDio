import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FiltroDias = 7 | 15 | 30 | null;

interface FiltroOption {
    label: string;
    value: FiltroDias;
}

const FILTROS: FiltroOption[] = [
    { label: 'Todos', value: null },
    { label: '7 días', value: 7 },
    { label: '15 días', value: 15 },
    { label: '30 días', value: 30 },
];

export default function AlertasVencimientoScreen() {
    const router = useRouter();
    const [alertas, setAlertas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroDias, setFiltroDias] = useState<FiltroDias>(30);

    const fetchAlertas = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lotes')
                .select('*, productos(nombre)')
                .gt('cantidad', 0)
                .order('fecha_vencimiento', { ascending: true });

            if (error) throw error;
            setAlertas(data || []);
        } catch (error: any) {
            console.error('Error cargando alertas:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlertas();
    }, [fetchAlertas]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertasFiltradas = alertas.filter(item => {
        const fechaVenc = new Date(item.fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((fechaVenc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (filtroDias === null) return diffDays <= 90; // Límite razonable para "Todos"
        return diffDays <= filtroDias;
    });

    const renderItem = ({ item }: { item: any }) => {
        const fechaVenc = new Date(item.fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((fechaVenc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const esVencido = diffDays < 0;

        const accentColor = esVencido ? '#b91c1c' : '#ea580c';
        const bgColor = esVencido ? '#fff5f5' : '#fff8f5';

        return (
            <View style={[styles.card, { backgroundColor: bgColor, borderLeftColor: accentColor }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold" style={styles.productName}>
                            {item.productos?.nombre}
                        </ThemedText>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: accentColor + '1A' }]}>
                                <Text style={[styles.statusText, { color: accentColor }]}>
                                    {esVencido ? '⚠ VENCIDO' : diffDays === 0 ? 'VENCE HOY' : `Vence en ${diffDays}d`}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Ionicons
                        name={esVencido ? 'skull-outline' : 'warning-outline'}
                        size={26}
                        color={accentColor}
                    />
                </View>

                <View style={styles.details}>
                    <View style={styles.detailItem}>
                        <Ionicons name="cube-outline" size={14} color="#64748b" />
                        <Text style={styles.detailText}>{item.cantidad} unidades</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                        <Text style={[styles.detailText, { fontWeight: '700', color: accentColor }]}>
                            {item.fecha_vencimiento}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <ThemedText type="title" style={styles.headerTitle}>Alertas de Vencimiento</ThemedText>
            </View>

            {/* Chips de filtro por días */}
            <View style={styles.filterRow}>
                {FILTROS.map((f) => (
                    <TouchableOpacity
                        key={String(f.value)}
                        style={[styles.chip, filtroDias === f.value && styles.chipActive]}
                        onPress={() => setFiltroDias(f.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, filtroDias === f.value && styles.chipTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Resumen */}
            <View style={styles.summary}>
                <Ionicons name="alert-circle" size={16} color="#991b1b" />
                <ThemedText style={styles.summaryText}>
                    {alertasFiltradas.length} lote{alertasFiltradas.length !== 1 ? 's' : ''} en este rango
                </ThemedText>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#dc2626" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={alertasFiltradas}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-circle-outline" size={52} color="#a3e635" />
                            <ThemedText style={styles.emptyText}>
                                ¡Sin alertas en este rango!
                            </ThemedText>
                        </View>
                    }
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fdf2f2' },
    header: {
        backgroundColor: '#dc2626',
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { marginRight: 15 },
    headerTitle: { color: '#fff', fontSize: 20 },

    // Filtros
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 15,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    chip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    chipActive: {
        backgroundColor: '#dc2626',
        borderColor: '#dc2626',
    },
    chipText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 12,
    },
    chipTextActive: {
        color: '#fff',
    },

    // Resumen
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        paddingHorizontal: 15,
        backgroundColor: '#fee2e2',
    },
    summaryText: { color: '#991b1b', fontWeight: '600', fontSize: 14 },

    listContent: { padding: 15, paddingBottom: 30 },

    // Card
    card: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    productName: { fontSize: 17, color: '#1e293b', marginBottom: 6 },
    statusRow: { flexDirection: 'row' },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    details: {
        marginTop: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
        gap: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    detailText: { fontSize: 14, color: '#475569' },

    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 4,
        color: '#94a3b8',
        fontSize: 15,
    },
});