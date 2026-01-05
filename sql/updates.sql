-- ============================================
-- SQL UPDATES - Sipote Malteada
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============ 1. ACTUALIZAR TABLA delivery_drivers ============
-- Agregar columnas para ubicacion y PIN

ALTER TABLE delivery_drivers
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP,
ADD COLUMN IF NOT EXISTS pin VARCHAR(4);

-- Comentario: El PIN son los ultimos 4 digitos de la cedula
-- Si no se configura, se usaran los ultimos 4 digitos del telefono

-- ============ 2. CREAR TABLA incidents ============
-- Para reportes de incidentes de los domiciliarios

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES delivery_drivers(id),
    driver_name VARCHAR(100),
    order_id INTEGER,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    image_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indices para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_incidents_driver ON incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_incidents_order ON incidents(order_id);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON incidents(resolved);

-- ============ 3. ACTUALIZAR TABLA orders ============
-- Agregar columna updated_at si no existe

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============ 4. HABILITAR RLS (Row Level Security) ============
-- Permitir acceso publico para la app (ajustar segun necesidades)

ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Politicas para delivery_drivers
DROP POLICY IF EXISTS "Allow all access to delivery_drivers" ON delivery_drivers;
CREATE POLICY "Allow all access to delivery_drivers" ON delivery_drivers
    FOR ALL USING (true);

-- Politicas para incidents
DROP POLICY IF EXISTS "Allow all access to incidents" ON incidents;
CREATE POLICY "Allow all access to incidents" ON incidents
    FOR ALL USING (true);

-- ============ 5. DATOS DE PRUEBA (OPCIONAL) ============
-- Descomentar si quieres agregar un domiciliario de prueba

-- INSERT INTO delivery_drivers (name, phone, status, active, pin)
-- VALUES ('Juan Domiciliario', '3001234567', 'disponible', true, '1234');

-- ============ VERIFICACION ============
-- Ejecutar para verificar que todo se creo correctamente

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'delivery_drivers';

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'incidents';
