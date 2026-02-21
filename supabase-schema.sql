-- ============================================
-- SCHEMA DE BASE DE DATOS VETQR
-- Para Supabase PostgreSQL
-- ============================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: ROLES
-- ============================================
CREATE TABLE roles (
    id_rol UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar roles iniciales
INSERT INTO roles (nombre_rol, descripcion) VALUES 
    ('admin', 'Administrador del sistema'),
    ('usuario', 'Usuario común');

-- ============================================
-- TABLA: USUARIOS_ADMIN
-- ============================================
CREATE TABLE usuarios_admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    id_rol UUID REFERENCES roles(id_rol) DEFAULT (SELECT id_rol FROM roles WHERE nombre_rol = 'admin'),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: QR_CODES
-- ============================================
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_qr VARCHAR(255) NOT NULL UNIQUE,
    id_admin_creador UUID NOT NULL REFERENCES usuarios_admin(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida por código
CREATE INDEX idx_qr_codes_codigo ON qr_codes(codigo_qr);
CREATE INDEX idx_qr_codes_admin ON qr_codes(id_admin_creador);

-- ============================================
-- TABLA: MASCOTAS
-- ============================================
CREATE TABLE mascotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_qr UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    nombre_mascota VARCHAR(100) NOT NULL,
    nombre_dueno VARCHAR(100) NOT NULL,
    direccion_dueno TEXT NOT NULL,
    email_dueno VARCHAR(255) NOT NULL,
    telefono_dueno VARCHAR(50),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas
CREATE INDEX idx_mascotas_qr ON mascotas(id_qr);
CREATE INDEX idx_mascotas_email ON mascotas(email_dueno);
CREATE INDEX idx_mascotas_nombre ON mascotas(nombre_dueno);
CREATE INDEX idx_mascotas_nombre_mascota ON mascotas(nombre_mascota);

-- ============================================
-- TABLA: ESCANEOS
-- ============================================
CREATE TABLE escaneos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_qr UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    direccion_ip INET,
    fecha_escaneo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_enviado BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX idx_escaneos_qr ON escaneos(id_qr);
CREATE INDEX idx_escaneos_fecha ON escaneos(fecha_escaneo);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE escaneos ENABLE ROW LEVEL SECURITY;

-- Políticas para roles (solo lectura pública)
CREATE POLICY "Roles visibles para todos" ON roles
    FOR SELECT USING (true);

-- Políticas para usuarios_admin (solo el mismo usuario puede ver sus datos)
CREATE POLICY "Usuarios pueden ver sus propios datos" ON usuarios_admin
    FOR SELECT USING (auth.uid() = id);

-- Políticas para qr_codes (admin puede ver sus propios QR)
CREATE POLICY "Admin puede ver sus QR" ON qr_codes
    FOR SELECT USING (id_admin_creador = auth.uid());

CREATE POLICY "Admin puede crear QR" ON qr_codes
    FOR INSERT WITH CHECK (id_admin_creador = auth.uid());

CREATE POLICY "Admin puede modificar sus QR" ON qr_codes
    FOR UPDATE USING (id_admin_creador = auth.uid());

CREATE POLICY "Admin puede eliminar sus QR" ON qr_codes
    FOR DELETE USING (id_admin_creador = auth.uid());

-- Políticas para mascotas (lectura pública para el flujo QR)
CREATE POLICY "Mascotas visibles para consulta QR" ON mascotas
    FOR SELECT USING (true);

CREATE POLICY "Cualquiera puede registrar mascota" ON mascotas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin puede modificar mascotas" ON mascotas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE qr_codes.id = mascotas.id_qr 
            AND qr_codes.id_admin_creador = auth.uid()
        )
    );

-- Políticas para escaneos
CREATE POLICY "Escaneos visibles para admin" ON escaneos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE qr_codes.id = escaneos.id_qr 
            AND qr_codes.id_admin_creador = auth.uid()
        )
    );

CREATE POLICY "Cualquiera puede crear escaneo" ON escaneos
    FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_admin_updated_at BEFORE UPDATE ON usuarios_admin
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mascotas_updated_at BEFORE UPDATE ON mascotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS DE PRUEBA (Opcional)
-- ============================================

-- Crear usuario admin de prueba (contraseña: admin123)
-- NOTA: En producción, usar bcrypt para hashear la contraseña
INSERT INTO usuarios_admin (email, password_hash, nombre, id_rol) 
VALUES (
    'admin@vetqr.com', 
    '$2a$10$YourHashedPasswordHere', -- Reemplazar con hash bcrypt de 'admin123'
    'Administrador', 
    (SELECT id_rol FROM roles WHERE nombre_rol = 'admin')
);

-- ============================================
-- PERMISOS PARA ANON Y AUTHENTICATED
-- ============================================

-- Permitir lectura anónima para el flujo QR
GRANT SELECT ON roles TO anon, authenticated;
GRANT SELECT ON qr_codes TO anon, authenticated;
GRANT SELECT ON mascotas TO anon, authenticated;
GRANT INSERT ON mascotas TO anon, authenticated;
GRANT INSERT ON escaneos TO anon, authenticated;

-- Permisos para usuarios autenticados (admin)
GRANT ALL ON usuarios_admin TO authenticated;
GRANT ALL ON qr_codes TO authenticated;
GRANT ALL ON mascotas TO authenticated;
GRANT ALL ON escaneos TO authenticated;

-- Secuencias
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
