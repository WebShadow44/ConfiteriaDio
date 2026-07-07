import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ConsultaStockScreen() {
    const router = useRouter();
    const [productosAgrupados, setProductosAgrupados] = useState<any[]>([]);
    const [filteredProductos, setFilteredProductos] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStock = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('lotes')
                .select('*, productos(id, nombre, activo, marcas(nombre), categorias(nombre))')
                .gt('cantidad', 0);

            if (error) throw error;

            if (data) {
                const activeLotes = data.filter(item => item.productos?.activo === true);
                
                const grouped = activeLotes.reduce((acc: any[], current: any) => {
                    const existingProduct = acc.find(p => p.producto_id === current.producto_id);
                    if (existingProduct) {
                        existingProduct.cantidadTotal += current.cantidad;
                    } else {
                        acc.push({
                            producto_id: current.producto_id,
                            nombre: current.productos?.nombre || 'Producto Desconocido',
                            marca: current.productos?.marcas?.nombre || 'Sin Marca',
                            categoria: current.productos?.categorias?.nombre || 'Sin Categoria',
                            cantidadTotal: current.cantidad,
                        });
                    }
                    return acc;
                }, []);
                
                grouped.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

                setProductosAgrupados(grouped);
                setFilteredProductos(grouped);
            }
        } catch (error: any) {
            console.error(error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchStock(); }, [fetchStock]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        const q = text.toLowerCase();
        const filtered = productosAgrupados.filter(item =>
            item.nombre?.toLowerCase().includes(q) ||
            item.marca?.toLowerCase().includes(q) ||
            item.categoria?.toLowerCase().includes(q)
        );
        setFilteredProductos(filtered);
    };

    const renderItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.productTitleFix}>{item.nombre}</Text>
                        <Text style={styles.productSubtitle}>
                            {item.marca} • {item.categoria}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.stockLabel}>Stock Total:</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeTextFix}>
                            {item.cantidadTotal} und
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
                <ThemedText style={styles.headerTitle}>Consulta de Stock</ThemedText>
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                    style={styles.input}
                    placeholder="Buscar por producto..."
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredProductos}
                    keyExtractor={(item) => item.producto_id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStock(); }} />}
                    ListEmptyComponent={<Text style={styles.emptyFix}>No se encontraron resultados.</Text>}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: '#2563eb', paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backButton: { marginRight: 0 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    input: { flex: 1, height: 45, fontSize: 16, marginLeft: 8, color: '#0f172a' },
    card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    productTitleFix: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    productSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#eff6ff' },
    badgeTextFix: { color: '#2563eb', fontWeight: 'bold', fontSize: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14 },
    stockLabel: { fontSize: 16, fontWeight: '600', color: '#475569' },
    emptyFix: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});