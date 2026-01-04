# Sipote Malteada

Sistema integral para restaurante: menu digital con QR, punto de venta (POS), panel de administracion, gestion de cocina, sistema de domicilios con notificaciones Telegram.

## Tecnologias

- HTML, CSS, JavaScript (Vanilla)
- Supabase (Base de datos)
- Telegram Bot API (Notificaciones)
- ImgBB (Almacenamiento de imagenes)

## Estructura del Proyecto

```
sipote-malteada/
├── css/
│   ├── styles.css
│   ├── admin.css
│   ├── pos.css
│   └── kitchen.css
├── js/
│   ├── config.js          # Credenciales (NO se sube a GitHub)
│   ├── config.example.js  # Plantilla de configuracion
│   ├── supabase.js        # Cliente Supabase
│   ├── admin.js           # Panel de administracion
│   ├── pos.js             # Punto de venta
│   ├── kitchen.js         # Vista cocina
│   ├── menu.js            # Menu publico
│   └── cart.js            # Carrito de compras
├── img/                   # Imagenes de productos
├── index.html             # Landing page
├── menu.html              # Menu digital
├── admin.html             # Panel de administracion
├── pos.html               # Punto de venta
├── kitchen.html           # Vista cocina
├── login.html             # Login de empleados
├── qr-generator.html      # Generador de QR para mesas
└── README.md
```

## Configuracion

### 1. Clonar el repositorio
```bash
git clone https://github.com/madfer93/demo-malteadas.git
cd demo-malteadas
```

### 2. Configurar credenciales
Copia el archivo de ejemplo y agrega tus credenciales:
```bash
cp js/config.example.js js/config.js
```

Edita `js/config.js` con tus datos:
```javascript
// Supabase
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';

// Telegram Bot
const TELEGRAM_BOT_TOKEN = "tu-bot-token";
const TELEGRAM_CHAT_ID = "tu-chat-id";

// ImgBB
const IMGBB_API_KEY = "tu-api-key";
```

### 3. Configurar Supabase
Crea las siguientes tablas en tu proyecto de Supabase:

- `products` - Catalogo de productos
- `orders` - Pedidos
- `sellers` - Empleados/vendedores
- `delivery_drivers` - Domiciliarios
- `offers` - Ofertas y promociones
- `pos_sales` - Ventas del POS

### 4. Ejecutar
Abre `index.html` en tu navegador o usa un servidor local:
```bash
npx serve .
```

## Paginas

| Pagina | Descripcion |
|--------|-------------|
| `index.html` | Landing page con destacados y ofertas |
| `menu.html` | Menu digital completo con carrito |
| `admin.html` | Panel de administracion |
| `pos.html` | Punto de venta para caja |
| `kitchen.html` | Vista para cocina con pedidos |
| `login.html` | Login de empleados |
| `qr-generator.html` | Generador de codigos QR para mesas |

## Funcionalidades

- Menu digital con carrito de compras
- Pedidos por WhatsApp
- Sistema de mesas con QR
- Panel de administracion completo
- Gestion de productos y ofertas
- Sistema de domicilios con asignacion de domiciliarios
- Notificaciones por Telegram
- Vista de cocina en tiempo real
- Punto de venta (POS)
- Dashboard con estadisticas

## Autor

Desarrollado por Variedades JyM para Negocios de Malteadas - Villavicencio, Meta, Colombia
