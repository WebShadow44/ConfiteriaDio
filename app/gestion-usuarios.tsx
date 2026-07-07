import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GestionUsuariosScreen() {
    const router = useRouter();
    const [perfiles, setPerfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [nombre, setNombre] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rol, setRol] = useState<'Administrador' | 'Trabajador'>('Trabajador');
    const [editingUser, setEditingUser] = useState<any | null>(null);

    const fetchPerfiles = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('perfiles').select('*').order('nombre', { ascending: true });
            if (error) throw error;
            setPerfiles(data || []);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPerfiles();
    }, [fetchPerfiles]);

    const guardarUsuario = async () => {
        if (!nombre || !nombreUsuario || !password) {
            Alert.alert('Error', 'Completa todos los campos obligatorios.');
            return;
        }

        setSaving(true);
        try {
            if (editingUser) {
                const { error } = await supabase
                    .from('perfiles')
                    .update({ nombre, nombre_usuario: nombreUsuario, password, rol })
                    .eq('id', editingUser.id);
                if (error) throw error;
                Alert.alert('Éxito', 'Usuario actualizado correctamente.');
            } else {
                const { error } = await supabase
                    .from('perfiles')
                    .insert([{ nombre, nombre_usuario: nombreUsuario, password, rol, activo: true }]);
                if (error) throw error;
                Alert.alert('Éxito', 'Usuario creado correctamente.');
            }

            setNombre('');
            setNombreUsuario('');
            setPassword('');
            setRol('Trabajador');
            setEditingUser(null);
            fetchPerfiles();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setNombre(user.nombre);
        setNombreUsuario(user.nombre_usuario || '');
        setPassword(user.password);
        setRol(user.rol as 'Administrador' | 'Trabajador');
    };

    const cancelEdit = () => {
        setEditingUser(null);
        setNombre('');
        setNombreUsuario('');
        setPassword('');
        setRol('Trabajador');
    };

    const toggleActivo = async (user: any) => {
        try {
            const nuevoEstado = !user.activo;
            const { error } = await supabase.from('perfiles').update({ activo: nuevoEstado }).eq('id', user.id);
            if (error) throw error;
            fetchPerfiles();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isAdmin = item.rol === 'Administrador';
        const isInactive = item.activo === false;

        return (
            <View style={[styles.card, isInactive && styles.cardInactive]}>
                {/* Cabecera de la tarjeta */}
                <View style={styles.cardTop}>
                    <View style={[styles.avatarCircle, isAdmin ? styles.avatarAdmin : styles.avatarWorker]}>
                        <Ionicons
                            name={isAdmin ? 'shield-checkmark' : 'person'}
                            size={20}
                            color="#fff"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.nameText, isInactive && styles.textInactive]}>
                            {item.nombre}
                            {isInactive ? '  (Inactivo)' : ''}
                        </Text>
                        <View style={[styles.rolBadge, isAdmin ? styles.rolBadgeAdmin : styles.rolBadgeWorker]}>
                            <Text style={[styles.rolBadgeText, isAdmin ? { color: '#1e40af' } : { color: '#065f46' }]}>
                                {item.rol}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                            <Ionicons name="pencil" size={18} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleActivo(item)} style={[styles.actionBtn, isInactive ? styles.actionBtnActivate : styles.actionBtnDeactivate]}>
                            <Ionicons
                                name={isInactive ? 'checkmark-circle' : 'close-circle'}
                                size={18}
                                color={isInactive ? '#10b981' : '#ef4444'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Credenciales */}
                <View style={styles.credentialsBox}>
                    <View style={styles.credentialRow}>
                        <View style={styles.credentialIcon}>
                            <Ionicons name="at-circle-outline" size={16} color="#2563eb" />
                        </View>
                        <Text style={styles.credentialLabel}>Usuario</Text>
                        <Text style={styles.credentialValue}>{item.nombre_usuario}</Text>
                    </View>
                    <View style={styles.credentialDivider} />
                    <View style={styles.credentialRow}>
                        <View style={styles.credentialIcon}>
                            <Ionicons name="lock-closed-outline" size={16} color="#8b5cf6" />
                        </View>
                        <Text style={styles.credentialLabel}>Contraseña</Text>
                        <Text style={styles.credentialValue}>
                            {'•'.repeat(Math.min(item.password?.length ?? 0, 10))}
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
                <View>
                    <ThemedText style={styles.headerTitle}>Gestión de Usuarios</ThemedText>
                    <ThemedText style={styles.headerSub}>{perfiles.length} usuario{perfiles.length !== 1 ? 's' : ''} registrado{perfiles.length !== 1 ? 's' : ''}</ThemedText>
                </View>
            </View>

            {/* Formulario */}
            <View style={[styles.formContainer, editingUser && styles.formContainerEditing]}>
                {editingUser && (
                    <View style={styles.editingBanner}>
                        <Ionicons name="pencil" size={14} color="#1e40af" />
                        <Text style={styles.editingBannerText}>Editando: {editingUser.nombre}</Text>
                        <TouchableOpacity onPress={cancelEdit} style={{ marginLeft: 'auto' }}>
                            <Ionicons name="close-circle" size={18} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputRow}>
                    <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre completo"
                        placeholderTextColor="#94a3b8"
                        value={nombre}
                        onChangeText={setNombre}
                    />
                </View>
                <View style={styles.inputRow}>
                    <Ionicons name="at-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre de usuario"
                        placeholderTextColor="#94a3b8"
                        value={nombreUsuario}
                        onChangeText={setNombreUsuario}
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Contraseña"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ paddingHorizontal: 10 }}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.rolLabel}>Rol del usuario</Text>
                <View style={styles.row}>
                    {(['Trabajador', 'Administrador'] as const).map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.chip, rol === r && styles.chipActive]}
                            onPress={() => setRol(r)}
                        >
                            <Ionicons
                                name={r === 'Administrador' ? 'shield-checkmark-outline' : 'person-outline'}
                                size={15}
                                color={rol === r ? '#fff' : '#64748b'}
                            />
                            <ThemedText style={[styles.chipText, rol === r && { color: '#fff' }]}>{r}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={[styles.saveButton, saving && { opacity: 0.7 }]}
                    onPress={guardarUsuario}
                    disabled={saving}
                >
                    <Ionicons name={editingUser ? 'save-outline' : 'person-add-outline'} size={18} color="#fff" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.saveButtonText}>
                        {saving ? 'Guardando...' : (editingUser ? 'Guardar Cambios' : 'Añadir Usuario')}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={perfiles}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                            <Text style={{ color: '#94a3b8', marginTop: 10 }}>No hay usuarios registrados.</Text>
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
        gap: 15,
    },
    backButton: { marginRight: 0 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 2 },

    // Formulario
    formContainer: {
        padding: 18,
        backgroundColor: '#fff',
        elevation: 3,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    formContainerEditing: {
        borderTopWidth: 3,
        borderTopColor: '#f59e0b',
    },
    editingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 14,
    },
    editingBannerText: { color: '#1e40af', fontWeight: '600', fontSize: 13, flex: 1 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        marginBottom: 10,
        paddingRight: 4,
    },
    inputIcon: { paddingHorizontal: 12 },
    input: {
        flex: 1,
        paddingVertical: 13,
        fontSize: 15,
        color: '#0f172a',
    },
    rolLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8, marginTop: 2 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    chip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 11,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
    saveButton: {
        backgroundColor: '#10b981',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

    // Lista
    listContent: { padding: 14, paddingBottom: 30 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    cardInactive: { opacity: 0.7 },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarAdmin: { backgroundColor: '#2563eb' },
    avatarWorker: { backgroundColor: '#10b981' },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    textInactive: { color: '#94a3b8', textDecorationLine: 'line-through' },
    rolBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    rolBadgeAdmin: { backgroundColor: '#dbeafe' },
    rolBadgeWorker: { backgroundColor: '#d1fae5' },
    rolBadgeText: { fontSize: 11, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
    },
    actionBtnActivate: { backgroundColor: '#d1fae5' },
    actionBtnDeactivate: { backgroundColor: '#fee2e2' },

    // Credenciales dentro de la tarjeta
    credentialsBox: {
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    credentialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        gap: 8,
    },
    credentialIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    credentialLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        width: 70,
    },
    credentialValue: {
        fontSize: 14,
        color: '#1e293b',
        fontWeight: '600',
        flex: 1,
    },
    credentialDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginHorizontal: 4,
    },
});
