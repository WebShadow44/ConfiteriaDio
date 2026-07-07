import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export default function GestionProductosScreen() {
    const router = useRouter();
    const { rol } = useAuthStore();
    
    const [vistaActiva, setVistaActiva] = useState<'Productos' | 'Marcas' | 'Categorias'>('Productos');

    const [productos, setProductos] = useState<any[]>([]);
    const [filteredProductos, setFilteredProductos] = useState<any[]>([]);
    
    const [marcas, setMarcas] = useState<any[]>([]);
    const [filteredMarcas, setFilteredMarcas] = useState<any[]>([]);
    
    const [categorias, setCategorias] = useState<any[]>([]);
    const [filteredCategorias, setFilteredCategorias] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [isProductModalVisible, setProductModalVisible] = useState(false);
    const [isSubModalVisible, setSubModalVisible] = useState(false);
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    
    const [dropdownType, setDropdownType] = useState<'Marca' | 'Categoria'>('Marca');

    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [selectedProductoId, setSelectedProductoId] = useState<any>(null);
    const [productNombre, setProductNombre] = useState('');
    const [productMarcaId, setProductMarcaId] = useState<any>(null);
    const [productCategoriaId, setProductCategoriaId] = useState<any>(null);
    const [productImagenUrl, setProductImagenUrl] = useState<string | null>(null);
    const [productLocalImage, setProductLocalImage] = useState<string | null>(null);
    const [productLocalImageBase64, setProductLocalImageBase64] = useState<string | null>(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setProductLocalImage(result.assets[0].uri);
            setProductLocalImageBase64(result.assets[0].base64 || null);
        }
    };

    const [isEditingSub, setIsEditingSub] = useState(false);
    const [selectedSubId, setSelectedSubId] = useState<any>(null);
    const [subNombre, setSubNombre] = useState('');

    const [saving, setSaving] = useState(false);

    /*
     * Verifica permisos de administrador al inicializar el modulo
     */
    useEffect(() => {
        if (rol !== 'Administrador') {
            Alert.alert('Acceso Denegado', 'Solo los administradores pueden acceder a este modulo.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    }, [rol]);

    /*
     * Consulta las tres tablas de base de datos de manera concurrente
     */
    const fetchAllData = useCallback(async () => {
        try {
            const [prodRes, marcRes, catRes] = await Promise.all([
                supabase.from('productos').select('*, marcas(nombre), categorias(nombre)').order('nombre', { ascending: true }),
                supabase.from('marcas').select('*').order('nombre', { ascending: true }),
                supabase.from('categorias').select('*').order('nombre', { ascending: true })
            ]);

            if (prodRes.error) throw prodRes.error;
            if (marcRes.error) throw marcRes.error;
            if (catRes.error) throw catRes.error;

            setProductos(prodRes.data || []);
            setFilteredProductos(prodRes.data || []);
            
            setMarcas(marcRes.data || []);
            setFilteredMarcas(marcRes.data || []);
            
            setCategorias(catRes.data || []);
            setFilteredCategorias(catRes.data || []);
        } catch (error: any) {
            console.error(error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    /*
     * Dispara la consulta inicial tras confirmar permisos
     */
    useEffect(() => { 
        if (rol === 'Administrador') {
            fetchAllData(); 
        }
    }, [fetchAllData, rol]);

    /*
     * Filtra los registros mostrados localmente acorde a la busqueda
     */
    const handleSearch = (text: string) => {
        setSearchQuery(text);
        const q = text.toLowerCase();

        if (vistaActiva === 'Productos') {
            const filtered = productos.filter(item =>
                item.nombre?.toLowerCase().includes(q) ||
                item.marcas?.nombre?.toLowerCase().includes(q) ||
                item.categorias?.nombre?.toLowerCase().includes(q)
            );
            setFilteredProductos(filtered);
        } else if (vistaActiva === 'Marcas') {
            const filtered = marcas.filter(item => item.nombre?.toLowerCase().includes(q));
            setFilteredMarcas(filtered);
        } else if (vistaActiva === 'Categorias') {
            const filtered = categorias.filter(item => item.nombre?.toLowerCase().includes(q));
            setFilteredCategorias(filtered);
        }
    };

    /*
     * Alterna entre las pestanas principales
     */
    const handleTabChange = (tab: 'Productos' | 'Marcas' | 'Categorias') => {
        setVistaActiva(tab);
        setSearchQuery('');
        setFilteredProductos(productos);
        setFilteredMarcas(marcas);
        setFilteredCategorias(categorias);
    };

    /*
     * Abre el modal para crear nuevas marcas o categorias
     */
    const openCreateSubModal = () => {
        setIsEditingSub(false);
        setSelectedSubId(null);
        setSubNombre('');
        setSubModalVisible(true);
    };

    /*
     * Abre el modal para editar una marca o categoria existente
     */
    const openEditSubModal = (item: any) => {
        setIsEditingSub(true);
        setSelectedSubId(item.id);
        setSubNombre(item.nombre || '');
        setSubModalVisible(true);
    };

    /*
     * Persiste la creacion o edicion de un submodulo (marca o categoria)
     */
    const handleSaveSub = async () => {
        if (!subNombre.trim()) {
            Alert.alert("Error", "El nombre no puede estar vacio.");
            return;
        }

        setSaving(true);
        const table = vistaActiva === 'Marcas' ? 'marcas' : 'categorias';

        try {
            const nuevoNombre = subNombre.trim();
            let returnedData = null;

            if (isEditingSub) {
                const { data, error } = await supabase
                    .from(table)
                    .update({ nombre: nuevoNombre })
                    .eq('id', selectedSubId)
                    .select('*')
                    .single();
                if (error) throw error;
                returnedData = data;
            } else {
                const { data, error } = await supabase
                    .from(table)
                    .insert([{ nombre: nuevoNombre, activo: true }])
                    .select('*')
                    .single();
                if (error) throw error;
                returnedData = data;
            }

            if (vistaActiva === 'Marcas') {
                const list = isEditingSub ? marcas.map(m => m.id === selectedSubId ? returnedData : m) : [...marcas, returnedData];
                const sorted = list.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setMarcas(sorted);
                setFilteredMarcas(sorted);
            } else {
                const list = isEditingSub ? categorias.map(c => c.id === selectedSubId ? returnedData : c) : [...categorias, returnedData];
                const sorted = list.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setCategorias(sorted);
                setFilteredCategorias(sorted);
            }

            Alert.alert("Exito", isEditingSub ? "Registro actualizado." : "Registro creado.");
            setSubModalVisible(false);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };

    /*
     * Abre el modal para registrar un producto en blanco
     */
    const openCreateProductModal = () => {
        setIsEditingProduct(false);
        setSelectedProductoId(null);
        setProductNombre('');
        setProductMarcaId(null);
        setProductCategoriaId(null);
        setProductImagenUrl(null);
        setProductLocalImage(null);
        setProductLocalImageBase64(null);
        setProductModalVisible(true);
    };

    /*
     * Abre el modal cargando los valores del producto
     */
    const openEditProductModal = (producto: any) => {
        setIsEditingProduct(true);
        setSelectedProductoId(producto.id);
        setProductNombre(producto.nombre || '');
        setProductMarcaId(producto.marca_id);
        setProductCategoriaId(producto.categoria_id);
        setProductImagenUrl(producto.imagen_url || null);
        setProductLocalImage(null);
        setProductLocalImageBase64(null);
        setProductModalVisible(true);
    };

    /*
     * Inserta o actualiza un registro en la tabla de productos
     */
    const handleSaveProduct = async () => {
        if (!productNombre.trim() || !productMarcaId || !productCategoriaId) {
            Alert.alert("Error", "Completa todos los campos del producto.");
            return;
        }

        setSaving(true);
        try {
            let uploadedUrl = productImagenUrl;

            if (productLocalImage) {
                const fileName = `producto_${Date.now()}.jpg`;
                let fileBody;
                
                if (Platform.OS === 'web') {
                    const response = await fetch(productLocalImage);
                    fileBody = await response.blob();
                } else {
                    if (!productLocalImageBase64) {
                        throw new Error("No se pudo obtener la imagen en formato base64.");
                    }
                    // Limpiar el prefijo data: si es que viene (por precaucion)
                    const base64Data = productLocalImageBase64.includes('base64,') 
                        ? productLocalImageBase64.split('base64,')[1] 
                        : productLocalImageBase64;
                    fileBody = decode(base64Data);
                }

                const { data: storageData, error: storageError } = await supabase.storage
                    .from('productos')
                    .upload(fileName, fileBody, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (storageError) {
                    throw new Error(`Error subiendo imagen: ${storageError.message}`);
                }

                const { data: publicUrlData } = supabase.storage
                    .from('productos')
                    .getPublicUrl(fileName);
                    
                uploadedUrl = publicUrlData.publicUrl;
            }

            const payload = {
                nombre: productNombre.trim(),
                marca_id: productMarcaId,
                categoria_id: productCategoriaId,
                imagen_url: uploadedUrl
            };

            let returnedData = null;

            if (isEditingProduct) {
                const { data, error } = await supabase
                    .from('productos')
                    .update(payload)
                    .eq('id', selectedProductoId)
                    .select('*, marcas(nombre), categorias(nombre)')
                    .single();
                if (error) throw error;
                returnedData = data;
            } else {
                const { data, error } = await supabase
                    .from('productos')
                    .insert([{ ...payload, activo: true }])
                    .select('*, marcas(nombre), categorias(nombre)')
                    .single();
                if (error) throw error;
                returnedData = data;
            }

            if (isEditingProduct) {
                const updatedList = productos.map(p => p.id === selectedProductoId ? returnedData : p);
                const sorted = [...updatedList].sort((a, b) => a.nombre.localeCompare(b.nombre));
                setProductos(sorted);
                setFilteredProductos(sorted);
            } else {
                const newList = [...productos, returnedData];
                const sorted = newList.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setProductos(sorted);
                setFilteredProductos(sorted);
            }

            Alert.alert("Exito", isEditingProduct ? "Producto actualizado correctamente." : "Producto creado correctamente.");
            setProductModalVisible(false);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };

    /*
     * Cambia la propiedad activa de un registro e impacta la UI
     */
    const handleToggleActivo = async (item: any, table: 'productos' | 'marcas' | 'categorias') => {
        try {
            const nuevoEstado = !item.activo;
            const { error } = await supabase.from(table).update({ activo: nuevoEstado }).eq('id', item.id);
            if (error) throw error;

            if (table === 'productos') {
                const updatedList = productos.map(p => p.id === item.id ? { ...p, activo: nuevoEstado } : p);
                setProductos(updatedList);
                const fUpdated = filteredProductos.map(p => p.id === item.id ? { ...p, activo: nuevoEstado } : p);
                setFilteredProductos(fUpdated);
            } else if (table === 'marcas') {
                const updatedList = marcas.map(m => m.id === item.id ? { ...m, activo: nuevoEstado } : m);
                setMarcas(updatedList);
                const fUpdated = filteredMarcas.map(m => m.id === item.id ? { ...m, activo: nuevoEstado } : m);
                setFilteredMarcas(fUpdated);
            } else {
                const updatedList = categorias.map(c => c.id === item.id ? { ...c, activo: nuevoEstado } : c);
                setCategorias(updatedList);
                const fUpdated = filteredCategorias.map(c => c.id === item.id ? { ...c, activo: nuevoEstado } : c);
                setFilteredCategorias(fUpdated);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    /*
     * Retorna el texto para el selector basado en el ID de la marca
     */
    const getMarcaName = (id: any) => {
        const found = marcas.find(m => m.id === id);
        return found ? found.nombre : 'Seleccionar Marca...';
    };

    /*
     * Retorna el texto para el selector basado en el ID de categoria
     */
    const getCategoriaName = (id: any) => {
        const found = categorias.find(c => c.id === id);
        return found ? found.nombre : 'Seleccionar Categoria...';
    };

    /*
     * Despliega el menu para elegir marca o categoria
     */
    const openDropdown = (type: 'Marca' | 'Categoria') => {
        setDropdownType(type);
        setDropdownVisible(true);
    };

    /*
     * Asigna el elemento elegido en el dropdown a su estado
     */
    const selectDropdownItem = (id: any) => {
        if (dropdownType === 'Marca') {
            setProductMarcaId(id);
        } else {
            setProductCategoriaId(id);
        }
        setDropdownVisible(false);
    };

    /*
     * Genera la tarjeta visual de un producto en la lista
     */
    const renderProductCard = ({ item }: { item: any }) => (
        <View style={[styles.card, item.activo === false && { opacity: 0.5 }]}>
            <View style={styles.cardHeader}>
                {item.imagen_url ? (
                    <Image source={{ uri: item.imagen_url }} style={styles.productThumbnail} />
                ) : (
                    <View style={styles.productThumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94a3b8" />
                    </View>
                )}
                <View style={{ flex: 1, paddingLeft: 10 }}>
                    <Text style={styles.titleFix}>{item.nombre}</Text>
                    <Text style={styles.subtitleFix}>{item.marcas?.nombre || 'Sin Marca'} - {item.categorias?.nombre || 'Sin Categoria'}</Text>
                </View>
                <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={() => handleToggleActivo(item, 'productos')} style={[styles.editButton, { backgroundColor: item.activo === false ? '#f1f5f9' : '#ecfdf5' }]}>
                        <Ionicons name={item.activo === false ? "eye-off-outline" : "eye-outline"} size={22} color={item.activo === false ? "#94a3b8" : "#10b981"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditProductModal(item)} style={styles.editButton}>
                        <Ionicons name="create-outline" size={22} color="#2563eb" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    /*
     * Genera la tarjeta visual para marcas y categorias
     */
    const renderSubCard = ({ item }: { item: any }) => {
        const table = vistaActiva === 'Marcas' ? 'marcas' : 'categorias';
        return (
            <View style={[styles.card, item.activo === false && { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.titleFix, { flex: 1 }]}>{item.nombre}</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity onPress={() => handleToggleActivo(item, table)} style={[styles.editButton, { backgroundColor: item.activo === false ? '#f1f5f9' : '#ecfdf5' }]}>
                            <Ionicons name={item.activo === false ? "eye-off-outline" : "eye-outline"} size={22} color={item.activo === false ? "#94a3b8" : "#10b981"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditSubModal(item)} style={styles.editButton}>
                            <Ionicons name="create-outline" size={22} color="#2563eb" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

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
                <ThemedText style={styles.headerTitle}>Gestion de Productos</ThemedText>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabButton, vistaActiva === 'Productos' && styles.tabButtonActive]} onPress={() => handleTabChange('Productos')}>
                    <Text style={[styles.tabText, vistaActiva === 'Productos' && styles.tabTextActive]}>Productos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, vistaActiva === 'Marcas' && styles.tabButtonActive]} onPress={() => handleTabChange('Marcas')}>
                    <Text style={[styles.tabText, vistaActiva === 'Marcas' && styles.tabTextActive]}>Marcas</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, vistaActiva === 'Categorias' && styles.tabButtonActive]} onPress={() => handleTabChange('Categorias')}>
                    <Text style={[styles.tabText, vistaActiva === 'Categorias' && styles.tabTextActive]}>Categorias</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionsContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.input}
                        placeholder="Buscar..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={vistaActiva === 'Productos' ? openCreateProductModal : openCreateSubModal}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={vistaActiva === 'Productos' ? filteredProductos : vistaActiva === 'Marcas' ? filteredMarcas : filteredCategorias}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={vistaActiva === 'Productos' ? renderProductCard : renderSubCard}
                    contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAllData(); }} />}
                    ListEmptyComponent={<Text style={styles.emptyFix}>No se encontraron registros.</Text>}
                />
            )}

            <Modal visible={isProductModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{isEditingProduct ? 'Editar Producto' : 'Nuevo Producto'}</Text>
                        
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={productNombre}
                            onChangeText={setProductNombre}
                        />

                        <Text style={styles.label}>Foto del Producto (Opcional)</Text>
                        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                            {productLocalImage ? (
                                <Image source={{ uri: productLocalImage }} style={styles.productPreviewImage} />
                            ) : productImagenUrl ? (
                                <Image source={{ uri: productImagenUrl }} style={styles.productPreviewImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="camera" size={30} color="#94a3b8" />
                                    <Text style={styles.imagePlaceholderText}>Añadir Foto</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Marca</Text>
                        <TouchableOpacity style={styles.dropdownSelector} onPress={() => openDropdown('Marca')}>
                            <Text style={styles.dropdownText}>{getMarcaName(productMarcaId)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        <Text style={styles.label}>Categoria</Text>
                        <TouchableOpacity style={styles.dropdownSelector} onPress={() => openDropdown('Categoria')}>
                            <Text style={styles.dropdownText}>{getCategoriaName(productCategoriaId)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setProductModalVisible(false)} disabled={saving}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveProduct} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{isEditingProduct ? 'Guardar' : 'Crear'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={isSubModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{isEditingSub ? 'Editar' : 'Nueva'} {vistaActiva === 'Marcas' ? 'Marca' : 'Categoria'}</Text>
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={subNombre}
                            onChangeText={setSubNombre}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubModalVisible(false)} disabled={saving}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveSub} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{isEditingSub ? 'Guardar' : 'Crear'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={isDropdownVisible} transparent={true} animationType="fade">
                <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
                    <View style={styles.dropdownModalContainer}>
                        <FlatList
                            data={(dropdownType === 'Marca' ? marcas : categorias).filter(item => item.activo !== false)}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={() => selectDropdownItem(item.id)}
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
    
    tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabButtonActive: { borderBottomColor: '#2563eb' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    tabTextActive: { color: '#2563eb' },

    actionsContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    input: { flex: 1, height: 45, fontSize: 16, marginLeft: 8, color: '#0f172a' },
    addButton: { backgroundColor: '#10b981', padding: 10, borderRadius: 12, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleFix: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
    subtitleFix: { fontSize: 14, color: '#64748b', marginTop: 4 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    editButton: { padding: 8, backgroundColor: '#eff6ff', borderRadius: 10 },
    emptyFix: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 20, color: '#0f172a' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f1f5f9' },
    cancelBtnText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    saveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#2563eb', minWidth: 90, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

    dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 20 },
    dropdownText: { color: '#0f172a', fontSize: 16 },
    dropdownModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    dropdownModalContainer: { backgroundColor: '#fff', borderRadius: 14, width: '80%', maxHeight: '60%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
    dropdownItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownItemText: { fontSize: 16, color: '#0f172a' },
    
    productThumbnail: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f1f5f9' },
    productThumbnailPlaceholder: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    imagePickerBtn: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 20, alignSelf: 'flex-start' },
    productPreviewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { color: '#94a3b8', fontSize: 12, marginTop: 4 }
});
