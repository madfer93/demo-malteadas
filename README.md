# Demo Malteada

Sistema integral para restaurante: menu digital con QR, punto de venta (POS), panel de administracion, gestion de cocina, sistema de domicilios con tracking en tiempo real y notificaciones.

**Demo en vivo:** https://madfer93.github.io/demo-malteadas/

## Tecnologias

- HTML, CSS, JavaScript (Vanilla)
- Supabase (Base de datos en tiempo real)
- Telegram Bot API (Notificaciones)
- ImgBB (Almacenamiento de imagenes)
- Leaflet (Mapas de tracking)
- WhatsApp API (Notificaciones a clientes)

## Estructura del Proyecto

```
demo-malteadas/
├── css/
│   ├── styles.css        # Estilos generales y menu
│   ├── admin.css         # Panel de administracion
│   ├── pos.css           # Punto de venta
│   ├── kitchen.css       # Vista cocina
│   └── domiciliario.css  # App de domiciliarios
├── js/
│   ├── config.js         # Credenciales
│   ├── config.example.js # Plantilla de configuracion
│   ├── supabase.js       # Cliente Supabase personalizado
│   ├── admin.js          # Panel de administracion
│   ├── pos.js            # Punto de venta
│   ├── kitchen.js        # Vista cocina
│   ├── menu.js           # Menu publico
│   ├── cart.js           # Carrito de compras
│   ├── domiciliario.js   # App de domiciliarios
│   ├── landing.js        # Landing page
│   └── slider.js         # Slider de ofertas
├── sql/
│   └── updates.sql       # Scripts SQL para Supabase
├── img/                  # Imagenes de productos
├── index.html            # Landing page
├── menu.html             # Menu digital
├── admin.html            # Panel de administracion
├── pos.html              # Punto de venta
├── kitchen.html          # Vista cocina
├── login.html            # Login de empleados
├── domiciliario.html     # App para repartidores
├── qr-generator.html     # Generador de QR para mesas
├── test.html             # Test de conexiones
└── README.md
```

## Paginas

| Pagina | Descripcion | Acceso |
|--------|-------------|--------|
| `index.html` | Landing page con destacados y ofertas | Publico |
| `menu.html` | Menu digital completo con carrito | Publico |
| `admin.html` | Panel de administracion completo | Login requerido |
| `pos.html` | Punto de venta para caja | Login requerido |
| `kitchen.html` | Vista para cocina con pedidos | Interno |
| `domiciliario.html` | App movil para repartidores | Login domiciliario |
| `login.html` | Login de empleados | Publico |
| `qr-generator.html` | Generador de codigos QR para mesas | Admin |
| `test.html` | Verificar conexiones (Supabase, Telegram, ImgBB) | Admin |

## Funcionalidades

### Menu Digital
- Catalogo de productos por categorias
- Carrito de compras
- Pedidos por WhatsApp
- Sistema de mesas con QR
- Ofertas y promociones

### Panel de Administracion
- Dashboard con estadisticas en tiempo real
- Gestion de productos (CRUD)
- Gestion de ofertas y destacados
- Slider de promociones
- Sistema de domicilios completo
- Gestion de domiciliarios con mapa de tracking
- Gestion de pedidos de mesa
- Gestion de vendedores

### Sistema de Domicilios
- Vista de pedidos nuevos, preparando y en camino
- Asignacion de domiciliarios
- Notificaciones por Telegram al admin
- Notificaciones por WhatsApp al cliente

### App de Domiciliarios
- Login por telefono + PIN
- Ver pedidos disponibles
- Tomar pedidos
- Navegacion con Google Maps
- Llamar/WhatsApp al cliente
- Marcar como entregado
- Tracking GPS en tiempo real
- Reportar incidentes con foto
- Historial de entregas del dia

### Mapa de Tracking (Admin)
- Ver ubicacion de todos los domiciliarios
- Marcadores con estado (disponible/en ruta)
- Actualizacion cada 30 segundos
- Informacion al hacer clic en marcador

### Notificaciones
- **Telegram (Admin):** Nuevos pedidos, pedidos tomados, entregas, incidentes
- **WhatsApp (Cliente):** Pedido tomado, domiciliario en camino, entregado

### Punto de Venta (POS)
- Venta rapida por categorias
- Asignacion de mesa
- Multiples metodos de pago
- Registro de ventas

### Vista Cocina
- Pedidos en columnas (Nuevos, Preparando, Listos)
- Actualizacion en tiempo real
- Sonido de notificacion para nuevos pedidos

## Configuracion

### 1. Clonar el repositorio
```bash
git clone https://github.com/madfer93/demo-malteadas.git
cd demo-malteadas
```

### 2. Configurar credenciales
Copia el archivo de ejemplo:
```bash
cp js/config.example.js js/config.js
```

Edita `js/config.js`:
```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
const TELEGRAM_BOT_TOKEN = "tu-bot-token";
const TELEGRAM_CHAT_ID = "tu-chat-id";
const IMGBB_API_KEY = "tu-api-key";
```

### 3. Configurar Supabase

Ejecuta el SQL en `sql/updates.sql` o crea estas tablas:

```sql
-- Productos
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    image_url TEXT,
    available BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pedidos
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    items JSONB,
    total DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pendiente',
    table_number INTEGER,
    customer_phone VARCHAR(20),
    delivery_address TEXT,
    notes TEXT,
    domiciliario_id INTEGER,
    domiciliario_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Domiciliarios
CREATE TABLE delivery_drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    telegram_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'disponible',
    current_order_id INTEGER,
    active BOOLEAN DEFAULT TRUE,
    pin VARCHAR(4),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    last_location_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Incidentes
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER,
    driver_name VARCHAR(100),
    order_id INTEGER,
    type VARCHAR(50),
    description TEXT,
    image_url TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ofertas
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    image_url TEXT,
    discount_percent INTEGER,
    active BOOLEAN DEFAULT TRUE,
    show_in_slider BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vendedores
CREATE TABLE sellers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(100),
    role VARCHAR(20) DEFAULT 'vendedor',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ventas POS
CREATE TABLE pos_sales (
    id SERIAL PRIMARY KEY,
    items JSONB,
    total DECIMAL(10,2),
    payment_method VARCHAR(20),
    table_number INTEGER,
    seller_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Ejecutar localmente
```bash
npx serve .
```

### 5. Deploy en GitHub Pages
1. Sube el codigo a GitHub
2. Ve a Settings > Pages
3. Selecciona la rama `main` y carpeta `/root`
4. El sitio estara en `https://tu-usuario.github.io/tu-repo/`

**Nota:** Para GitHub Pages, el archivo `config.js` debe estar incluido (quitar de `.gitignore`).

## Credenciales de Demo

Para probar el sistema:
- **Admin:** usuario: `admin`, password: `admin123`
- **Domiciliario:** telefono registrado + PIN `1234`

## Autor

Desarrollado para Demo Malteada - Villavicencio, Meta, Colombia
