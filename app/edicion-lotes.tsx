import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import DateTimePicker from '@/lib/DateTimePicker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EdicionLotesScreen() {
    const router = useRouter();
    const { rol, id: perfil_id } = useAuthStore();

    const [lotes, setLotes] = useState<any[]>([]);
    const [filteredLotes, setFilteredLotes] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedLote, setSelectedLote] = useState<any>(null);
    const [editCantidad, setEditCantidad] = useState('');
    const [editFecha, setEditFecha] = useState(new Date());
    const [editLoteNum, setEditLoteNum] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const [productos, setProductos] = useState<any[]>([]);
    const [selectedProductoId, setSelectedProductoId] = useState<any>(null);
    const [showProductoDropdown, setShowProductoDropdown] = useState(false);

    useEffect(() => {
        if (rol !== 'Administrador') {
            Alert.alert('Acceso Denegado', 'Solo los administradores pueden acceder a este modulo.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    }, [rol]);

    const fetchLotes = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('lotes')
                // AQUI ESTA LA SOLUCIÓN: Anidamos las consultas hacia categorias y marcas
                .select('*, productos(nombre, categorias(nombre), marcas(nombre))')
                .eq('estado', 'Activo')
                .order('fecha_vencimiento', { ascending: true });

            if (error) throw error;
            setLotes(data || []);
            setFilteredLotes(data || []);

            const { data: prodData, error: prodError } = await supabase.from('productos').select('id, nombre').eq('activo', true);
            if (prodData && !prodError) {
                setProductos(prodData);
            }
        } catch (error: any) {
            console.error(error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (rol === 'Administrador') {
            fetchLotes();
        }
    }, [fetchLotes, rol]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        const q = text.toLowerCase();
        const filtered = lotes.filter(item =>
            item.productos?.nombre?.toLowerCase().includes(q) ||
            item.numero_lote?.toLowerCase().includes(q)
        );
        setFilteredLotes(filtered);
    };

    const openEditModal = (lote: any) => {
        setSelectedLote(lote);
        setEditCantidad(lote.cantidad.toString());
        setEditFecha(new Date(lote.fecha_vencimiento));
        setEditLoteNum(lote.numero_lote || '');
        setSelectedProductoId(lote.producto_id);
        setModalVisible(true);
    };

    const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowPicker(false);
        if (selectedDate) {
            setEditFecha(selectedDate);
        }
    };

    const handleSaveEdit = async () => {
        if (!editCantidad || isNaN(Number(editCantidad)) || !editLoteNum || !selectedProductoId) {
            Alert.alert("Error", "Ingresa datos validos en todos los campos.");
            return;
        }

        setSaving(true);
        try {
            const cantidadNumerica = parseInt(editCantidad);
            const fechaString = editFecha.toISOString().split('T')[0];
            const diferenciaCantidad = cantidadNumerica - selectedLote.cantidad;

            const { error: errorUpdate } = await supabase
                .from('lotes')
                .update({
                    cantidad: cantidadNumerica,
                    fecha_vencimiento: fechaString,
                    producto_id: selectedProductoId,
                    numero_lote: editLoteNum
                })
                .eq('id', selectedLote.id);

            if (errorUpdate) throw errorUpdate;

            const { error: errorMov } = await supabase
                .from('movimientos')
                .insert([{
                    lote_id: selectedLote.id,
                    perfil_id: perfil_id,
                    tipo_movimiento: 'Ajuste',
                    motivo: 'Correccion por error de ingreso',
                    cantidad: diferenciaCantidad
                }]);

            if (errorMov) throw errorMov;

            Alert.alert("Exito", "Lote actualizado correctamente.");
            setModalVisible(false);
            fetchLotes();
        } catch (error: any) {
            Alert.alert("Error al actualizar", error.message);
        } finally {
            setSaving(false);
        }
    };

    const getSelectedProductoName = () => {
        const prod = productos.find(p => p.id === selectedProductoId);
        return prod ? prod.nombre : 'Seleccionar Producto...';
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.productTitleFix}>{item.productos?.nombre}</Text>
                    <Text style={styles.loteLabelFix}>Lote: {item.numero_lote || 'N/A'}</Text>
                </View>
                <View style={styles.badgeNormal}>
                    <Text style={styles.badgeTextFix}>{item.cantidad} und</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.dateTextFix}>Vence: {item.fecha_vencimiento}</Text>
                </View>
                <Ionicons name="create-outline" size={20} color="#2563eb" />
            </View>
        </TouchableOpacity>
    );

    if (rol !== 'Administrador') {
        return (
            <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#2563eb" />
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Edicion de Lotes</ThemedText>
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                    style={styles.input}
                    placeholder="Buscar por producto o lote..."
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredLotes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLotes(); }} />}
                    ListEmptyComponent={<Text style={styles.emptyFix}>No se encontraron lotes activos.</Text>}
                />
            )}

            <Modal visible={isModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Editar Lote</Text>

                        <Text style={[styles.label, { marginTop: 15 }]}>Producto Asociado</Text>
                        <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowProductoDropdown(true)}>
                            <Text style={styles.dropdownText}>{getSelectedProductoName()}</Text>
                            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        <Text style={styles.label}>Numero de Lote</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editLoteNum}
                            onChangeText={setEditLoteNum}
                        />

                        <Text style={styles.label}>Cantidad Ajustada</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={editCantidad}
                            onChangeText={setEditCantidad}
                        />

                        <Text style={styles.label}>Fecha de Vencimiento</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={() => setShowPicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                            <Text style={styles.dateText}>
                                {editFecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        {showPicker && (
                            <DateTimePicker
                                value={editFecha}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onChangeDate}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveEdit} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showProductoDropdown} transparent={true} animationType="fade">
                <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={() => setShowProductoDropdown(false)}>
                    <View style={styles.dropdownModalContainer}>
                        <FlatList
                            data={productos}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        setSelectedProductoId(item.id);
                                        setShowProductoDropdown(false);
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>{item.nombre}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
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
    productTitleFix: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
    loteLabelFix: { fontSize: 13, color: '#64748b', marginTop: 2 },
    badgeNormal: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeTextFix: { color: '#2563eb', fontWeight: 'bold', fontSize: 13 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateTextFix: { fontSize: 14, color: '#475569' },
    emptyFix: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15, color: '#0f172a' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 24 },
    dateText: { marginLeft: 10, fontSize: 16, color: '#0f172a' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f1f5f9' },
    cancelBtnText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    saveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#2563eb', minWidth: 90, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

    dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 15 },
    dropdownText: { color: '#0f172a', fontSize: 16 },
    dropdownModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    dropdownModalContainer: { backgroundColor: '#fff', borderRadius: 14, width: '80%', maxHeight: '60%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
    dropdownItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownItemText: { fontSize: 16, color: '#0f172a' }
});
