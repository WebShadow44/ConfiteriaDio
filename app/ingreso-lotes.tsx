import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@/lib/DateTimePicker';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export default function IngresoLotesScreen() {
    const router = useRouter();
    const { id: perfil_id } = useAuthStore();

    const [producto, setProducto] = useState('');
    const [loteNum, setLoteNum] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [sugerencias, setSugerencias] = useState<any[]>([]);
    const [allProductos, setAllProductos] = useState<any[]>([]);
    const [showSugerencias, setShowSugerencias] = useState(false);

    const [esProductoNuevo, setEsProductoNuevo] = useState(false);
    const [marca, setMarca] = useState('');
    
    const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([]);
    const [categoria, setCategoria] = useState('');
    const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);
    const [isNuevaCategoria, setIsNuevaCategoria] = useState(false);

    useEffect(() => {
        const fetchProductosData = async () => {
            const { data, error } = await supabase
                .from('productos')
                .select('id, nombre, activo, marcas(nombre), categorias(nombre)')
                .eq('activo', true);

            if (data && !error) {
                setAllProductos(data);
                const categorias = data.map((p: any) => p.categorias?.nombre).filter(Boolean);
                const uniqueCategorias = Array.from(new Set(categorias));
                setCategoriasDisponibles(uniqueCategorias as string[]);
            }
        };
        fetchProductosData();
    }, []);

    const handleChangeProducto = (text: string) => {
        setProducto(text);
        if (text.length > 0) {
            const matches = allProductos.filter(p => p.nombre.toLowerCase().includes(text.toLowerCase()) && p.nombre.toLowerCase() !== text.toLowerCase());
            setSugerencias(matches);
            setShowSugerencias(true);

            const matchExacto = allProductos.some(p => p.nombre.toLowerCase() === text.toLowerCase());
            setEsProductoNuevo(!matchExacto);
        } else {
            setShowSugerencias(false);
            setEsProductoNuevo(false);
        }
    };

    const handleSelectSugerencia = (item: any) => {
        setProducto(item.nombre);
        setShowSugerencias(false);
        setEsProductoNuevo(false);
    };

    const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowPicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSelectCategoria = (cat: string) => {
        if (cat === 'Añadir nueva categoría...') {
            setIsNuevaCategoria(true);
            setCategoria('');
        } else {
            setIsNuevaCategoria(false);
            setCategoria(cat);
        }
        setShowCategoriaDropdown(false);
    };

    const guardarLote = async () => {
        if (!producto || !cantidad || !loteNum) {
            Alert.alert("Campos incompletos", "Por favor completa el nombre, cantidad y No de lote.");
            return;
        }

        if (esProductoNuevo && (!marca || !categoria)) {
            Alert.alert("Campos incompletos", "Por favor completa la marca y categoria para el nuevo producto.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            Alert.alert("Error", "No se pueden registrar lotes vencidos.");
            return;
        }

        setLoading(true);

        try {
            let producto_id;
            const { data: prodData, error: prodError } = await supabase
                .from('productos')
                .select('id')
                .eq('nombre', producto)
                .single();

            if (prodData) {
                producto_id = prodData.id;
            } else {
                const { data: newProdData, error: newProdError } = await supabase
                    .from('productos')
                    .insert([{ 
                        nombre: producto.trim(), 
                        categoria: categoria.trim(), 
                        marca: marca.trim() 
                    }])
                    .select('id')
                    .single();

                if (newProdError || !newProdData) throw newProdError ?? new Error('No se pudo crear el producto.');
                producto_id = newProdData.id;
            }

            const { data: loteData, error: errorLote } = await supabase
                .from('lotes')
                .insert([{
                    producto_id: producto_id,
                    numero_lote: loteNum,
                    cantidad: parseInt(cantidad),
                    fecha_vencimiento: date.toISOString().split('T')[0],
                    estado: 'Activo'
                }])
                .select('id')
                .single();

            if (errorLote) throw errorLote;

            const { error: errorMov } = await supabase
                .from('movimientos')
                .insert([{
                    lote_id: loteData.id,
                    perfil_id: perfil_id,
                    tipo_movimiento: 'Ingreso',
                    motivo: 'Abastecimiento',
                    cantidad: parseInt(cantidad)
                }]);

            if (errorMov) throw errorMov;

            Alert.alert("Exito", "Lote y movimiento registrados correctamente.");
            router.back();

        } catch (error: any) {
            Alert.alert("Error de Registro", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <ThemedText type="title" style={styles.headerTitle}>Registro de Lote</ThemedText>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.label}>Nombre del Producto</ThemedText>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Galletas Casino"
                    placeholderTextColor="#94a3b8"
                    value={producto}
                    onChangeText={handleChangeProducto}
                />
                {showSugerencias && sugerencias.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {sugerencias.map((sug, index) => (
                            <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectSugerencia(sug)}>
                                <ThemedText style={styles.suggestionText}>{sug.nombre}</ThemedText>
                                <ThemedText style={styles.suggestionSubText}>{sug.marcas?.nombre || 'Sin Marca'} - {sug.categorias?.nombre || 'Sin Categoria'}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {esProductoNuevo && (
                    <>
                        <ThemedText style={styles.label}>Marca</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. Nabisco"
                            placeholderTextColor="#94a3b8"
                            value={marca}
                            onChangeText={setMarca}
                        />

                        <ThemedText style={styles.label}>Categoria</ThemedText>
                        <TouchableOpacity 
                            style={styles.dropdownSelector} 
                            onPress={() => setShowCategoriaDropdown(true)}
                        >
                            <ThemedText style={styles.dropdownText}>
                                {isNuevaCategoria ? 'Nueva Categoria Personalizada' : (categoria || 'Seleccionar categoria...')}
                            </ThemedText>
                            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        {isNuevaCategoria && (
                            <TextInput
                                style={[styles.input, { marginTop: 10 }]}
                                placeholder="Escribe la nueva categoria..."
                                placeholderTextColor="#94a3b8"
                                value={categoria}
                                onChangeText={setCategoria}
                            />
                        )}
                    </>
                )}

                <ThemedText style={styles.label}>Numero de Lote (Fisico)</ThemedText>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. LOT-2026-001"
                    placeholderTextColor="#94a3b8"
                    value={loteNum}
                    onChangeText={setLoteNum}
                />

                <ThemedText style={styles.label}>Cantidad Inicial</ThemedText>
                <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={cantidad}
                    onChangeText={setCantidad}
                />

                <ThemedText style={styles.label}>Fecha de Vencimiento</ThemedText>
                <TouchableOpacity
                    style={styles.dateSelector}
                    onPress={() => setShowPicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                    <ThemedText style={styles.dateText}>
                        {date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </ThemedText>
                </TouchableOpacity>

                {showPicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onChangeDate}
                        minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                )}

                <TouchableOpacity
                    style={[styles.saveButton, loading && { opacity: 0.7 }]}
                    onPress={guardarLote}
                    disabled={loading}
                >
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.saveButtonText}>
                        {loading ? "Procesando..." : "Confirmar Ingreso"}
                    </ThemedText>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal visible={showCategoriaDropdown} transparent={true} animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoriaDropdown(false)}>
                    <View style={styles.dropdownModal}>
                        <FlatList
                            data={[...categoriasDisponibles, 'Añadir nueva categoría...']}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelectCategoria(item)}>
                                    <Text style={[styles.dropdownItemText, item === 'Añadir nueva categoría...' && { color: '#2563eb', fontWeight: 'bold' }]}>{item}</Text>
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
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { marginRight: 15 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    form: { padding: 25 },
    label: { fontSize: 15, color: '#475569', marginBottom: 8, fontWeight: '700' },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
        color: '#0f172a',
    },
    dropdownSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
    },
    dropdownText: { color: '#0f172a', fontSize: 16 },
    suggestionsContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginTop: -15, marginBottom: 20, elevation: 2 },
    suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    suggestionText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
    suggestionSubText: { color: '#64748b', fontSize: 13, marginTop: 4 },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 16,
        marginBottom: 35,
    },
    dateText: { marginLeft: 12, fontSize: 16, color: '#0f172a', fontWeight: '500' },
    saveButton: {
        backgroundColor: '#10b981',
        padding: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    dropdownModal: { backgroundColor: '#fff', borderRadius: 14, width: '80%', maxHeight: '60%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
    dropdownItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownItemText: { fontSize: 16, color: '#0f172a' }
});