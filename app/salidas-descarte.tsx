import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

export default function SalidasDescarteScreen() {
    const router = useRouter();
    const { id: perfil_id } = useAuthStore();

    const [lotes, setLotes] = useState<any[]>([]);
    const [filteredLotes, setFilteredLotes] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [selectedLote, setSelectedLote] = useState<any | null>(null);
    const [cantidadSalida, setCantidadSalida] = useState('');
    const [motivo, setMotivo] = useState<'Venta' | 'Descarte'>('Venta');

    const fetchStock = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('lotes')
                .select('*, productos(nombre, imagen_url)')
                .gt('cantidad', 0)
                .order('fecha_vencimiento', { ascending: true });
            if (error) throw error;
            setLotes(data || []);
            setFilteredLotes(data || []);
        } catch (error: any) {
            console.error(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStock(); }, [fetchStock]);

    const handleBack = () => {
        if (selectedLote) {
            setSelectedLote(null);
            setCantidadSalida('');
            setMotivo('Venta');
        } else {
            router.back();
        }
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        const q = text.toLowerCase();
        const filtered = lotes.filter(item =>
            item.productos?.nombre?.toLowerCase().includes(q) ||
            item.numero_lote?.toLowerCase().includes(q)
        );
        setFilteredLotes(filtered);
    };

    const registrarSalida = async () => {
        if (!selectedLote) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lotDate = new Date(selectedLote.fecha_vencimiento);
        lotDate.setHours(0, 0, 0, 0);
        const isExpired = lotDate < today;

        if (motivo === 'Venta' && isExpired) {
            Alert.alert('Alerta de Seguridad', 'No se puede registrar una venta con un lote vencido. Cambia el motivo a Descarte.');
            return;
        }

        const numSalida = parseInt(cantidadSalida);

        if (isNaN(numSalida) || numSalida <= 0 || numSalida > selectedLote.cantidad) {
            Alert.alert('Error', 'Cantidad no válida.');
            return;
        }

        const nuevaCantidad = selectedLote.cantidad - numSalida;
        const nuevoEstado = nuevaCantidad === 0
            ? (motivo === 'Venta' ? 'Agotado' : 'Mermado')
            : selectedLote.estado;

        try {
            const { error: errStock } = await supabase
                .from('lotes')
                .update({ cantidad: nuevaCantidad, estado: nuevoEstado })
                .eq('id', selectedLote.id);

            if (errStock) throw errStock;

            const { error: errMov } = await supabase.from('movimientos').insert([{
                lote_id: selectedLote.id,
                perfil_id: perfil_id,
                tipo_movimiento: 'Salida',
                motivo: motivo,
                cantidad: numSalida
            }]);

            if (errMov) throw errMov;

            Alert.alert('Éxito', 'Stock actualizado correctamente.');
            setSelectedLote(null);
            setCantidadSalida('');
            setMotivo('Venta');
            fetchStock();

        } catch (err: any) {
            Alert.alert('Error al descontar', err.message || 'No se pudo actualizar el stock.');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lotDate = new Date(item.fecha_vencimiento);
        lotDate.setHours(0, 0, 0, 0);
        const isExpired = lotDate < today;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedLote(item)}
                activeOpacity={0.7}
            >
                {item.productos?.imagen_url ? (
                    <Image source={{ uri: item.productos.imagen_url }} style={styles.productThumbnail} />
                ) : (
                    <View style={styles.productThumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94a3b8" />
                    </View>
                )}
                <View style={{ flex: 1, paddingLeft: 10 }}>
                    <Text style={styles.prodNameFix}>{item.productos?.nombre}</Text>
                    <Text style={styles.cardSubFix}>Lote: {item.numero_lote || 'Sin N°'} | Stock: {item.cantidad}</Text>
                    <Text style={[styles.cardSubFix, isExpired && { color: '#ef4444', fontWeight: '600' }]}>
                        {isExpired ? '⚠ VENCIDO · ' : 'Vence: '}{item.fecha_vencimiento}
                    </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={26} color="#2563eb" />
            </TouchableOpacity>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>
                    {selectedLote ? 'Registrar Salida' : 'Salidas y Descarte'}
                </ThemedText>
            </View>

            {!selectedLote ? (
                <>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Buscar por producto o lote..."
                            placeholderTextColor="#94a3b8"
                            value={search}
                            onChangeText={handleSearch}
                        />
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={filteredLotes}
                            keyExtractor={item => item.id.toString()}
                            renderItem={renderItem}
                            contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                            ListEmptyComponent={<Text style={styles.emptyFix}>No hay stock disponible.</Text>}
                        />
                    )}
                </>
            ) : (
                <View style={styles.form}>
                    <View style={styles.infoBox}>
                        <ThemedText style={styles.infoTitle}>{selectedLote.productos?.nombre}</ThemedText>
                        <ThemedText style={styles.infoSub}>
                            Lote: {selectedLote.numero_lote || 'Sin N°'}
                        </ThemedText>
                        <ThemedText style={{ color: '#1e40af', marginTop: 4 }}>
                            Stock disponible: {selectedLote.cantidad} unidades
                        </ThemedText>
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const lotDate = new Date(selectedLote.fecha_vencimiento);
                            lotDate.setHours(0, 0, 0, 0);
                            return lotDate < today ? (
                                <View style={styles.expiredTag}>
                                    <Ionicons name="warning" size={13} color="#b91c1c" />
                                    <Text style={styles.expiredTagText}>Lote vencido — se registrará como Descarte</Text>
                                </View>
                            ) : null;
                        })()}
                    </View>

                    <ThemedText style={styles.labelForm}>Cantidad a retirar</ThemedText>
                    <TextInput
                        style={styles.inputForm}
                        keyboardType="numeric"
                        value={cantidadSalida}
                        onChangeText={setCantidadSalida}
                        placeholder="Ej. 10"
                        placeholderTextColor="#cbd5e1"
                        autoFocus
                    />

                    <ThemedText style={styles.labelForm}>Motivo de la Salida</ThemedText>
                    <View style={styles.motivoRow}>
                        {(['Venta', 'Descarte'] as const).map((m) => (
                            <TouchableOpacity
                                key={m}
                                style={[
                                    styles.motivoChip,
                                    motivo === m && (m === 'Venta' ? styles.motivoChipVenta : styles.motivoChipDescarte)
                                ]}
                                onPress={() => setMotivo(m)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={m === 'Venta' ? 'cart-outline' : 'trash-outline'}
                                    size={18}
                                    color={motivo === m ? '#fff' : '#64748b'}
                                />
                                <ThemedText style={[styles.motivoChipText, motivo === m && { color: '#fff' }]}>
                                    {m}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.btnConfirm} onPress={registrarSalida}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <ThemedText style={styles.btnText}>Confirmar Salida</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setSelectedLote(null)} style={styles.cancelLink}>
                        <Text style={{ color: '#64748b' }}>← Volver a la lista</Text>
                    </TouchableOpacity>
                </View>
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
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 15,
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    input: { flex: 1, height: 50, fontSize: 16, color: '#0f172a' },
    card: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    prodNameFix: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
    cardSubFix: { color: '#64748b', fontSize: 13, marginTop: 4 },
    form: { padding: 20 },
    infoBox: {
        backgroundColor: '#eff6ff',
        padding: 18,
        borderRadius: 15,
        marginBottom: 25,
        borderLeftWidth: 4,
        borderLeftColor: '#2563eb',
    },
    infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
    infoSub: { fontSize: 14, color: '#3b82f6', marginTop: 2 },
    expiredTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
    },
    expiredTagText: { fontSize: 12, color: '#b91c1c', fontWeight: '600' },
    labelForm: { fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputForm: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        padding: 15,
        fontSize: 18,
        marginBottom: 20,
        color: '#0f172a',
    },
    motivoRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    motivoChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    motivoChipVenta: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    motivoChipDescarte: {
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
    },
    motivoChipText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748b',
    },
    btnConfirm: {
        backgroundColor: '#10b981',
        padding: 20,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
    },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    cancelLink: { marginTop: 25, alignItems: 'center' },
    emptyFix: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
    productThumbnail: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f1f5f9' },
    productThumbnailPlaceholder: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }
});