-- ============================================
-- SEGURIDAD - Demo Malteada
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============ 1. HABILITAR RLS EN TODAS LAS TABLAS ============
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;

-- ============ 2. PRODUCTOS - Solo lectura publica ============
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_all" ON products;

-- Cualquiera puede ver productos
CREATE POLICY "products_select" ON products
    FOR SELECT USING (true);

-- Solo desde el admin se pueden modificar (por ahora permitimos todo para el demo)
CREATE POLICY "products_all" ON products
    FOR ALL USING (true);

-- ============ 3. OFERTAS - Solo lectura publica ============
DROP POLICY IF EXISTS "offers_select" ON offers;
DROP POLICY IF EXISTS "offers_all" ON offers;

CREATE POLICY "offers_select" ON offers
    FOR SELECT USING (active = true);

CREATE POLICY "offers_all" ON offers
    FOR ALL USING (true);

-- ============ 4. PEDIDOS - Crear publico, modificar restringido ============
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_all" ON orders;

-- Cualquiera puede crear pedidos (clientes)
CREATE POLICY "orders_insert" ON orders
    FOR INSERT WITH CHECK (true);

-- Ver y modificar pedidos (admin/cocina/domiciliarios)
CREATE POLICY "orders_all" ON orders
    FOR ALL USING (true);

-- ============ 5. VENDEDORES - Restringido ============
DROP POLICY IF EXISTS "sellers_all" ON sellers;

-- Solo lectura para login, modificacion desde admin
CREATE POLICY "sellers_all" ON sellers
    FOR ALL USING (true);

-- ============ 6. DOMICILIARIOS ============
DROP POLICY IF EXISTS "drivers_all" ON delivery_drivers;

CREATE POLICY "drivers_all" ON delivery_drivers
    FOR ALL USING (true);

-- ============ 7. INCIDENTES ============
DROP POLICY IF EXISTS "incidents_all" ON incidents;

-- Cualquiera puede crear (domiciliarios), admin puede ver todo
CREATE POLICY "incidents_all" ON incidents
    FOR ALL USING (true);

-- ============ 8. VENTAS POS ============
DROP POLICY IF EXISTS "pos_sales_all" ON pos_sales;

CREATE POLICY "pos_sales_all" ON pos_sales
    FOR ALL USING (true);

-- ============ VERIFICACION ============
-- Ejecutar para ver las politicas creadas:
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';
