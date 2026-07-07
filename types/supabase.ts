export interface Perfil {
    pin_acceso: string;
    nombre: string;
    rol: string;
    activo?: boolean;
}

export interface Lote {
    id: string | number;
    nombre_producto: string;
    numero_lote: string;
    cantidad: number;
    fecha_vencimiento: string;
}

export interface Movimiento {
    id?: string | number;
    nombre_producto: string;
    tipo_movimiento: 'Ingreso' | 'Salida';
    motivo: string;
    cantidad: number;
    usuario: string;
}
