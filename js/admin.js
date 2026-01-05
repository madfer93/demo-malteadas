// Admin Panel Completo - Sipote Malteada
// Las credenciales se cargan desde config.js

async function sendTelegramNotification(message) {
    if (!TELEGRAM_CHAT_ID) {
        console.warn("Telegram: No hay Chat ID configurado");
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "HTML"
            })
        });

        const data = await response.json();
        if (data.ok) {
            console.log("Telegram: Mensaje enviado");
            return true;
        } else {
            console.error("Telegram error:", data.description);
            return false;
        }
    } catch (error) {
        console.error("Telegram error:", error);
        return false;
    }
}

function formatDeliveryMessage(order) {
    // Obtener URL base para el link de la app
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    const appLink = `${baseUrl}/domiciliario.html`;

    return `🛵 <b>NUEVO PEDIDO A DOMICILIO</b>

📦 <b>Pedido #${order.id}</b>
💰 Total: <b>$${Number(order.total || 0).toLocaleString("es-CO")}</b>

📍 <b>Direccion:</b>
${order.delivery_address || "Sin direccion"}

📞 <b>Cliente:</b> ${order.customer_phone || "Sin telefono"}

${order.notes ? `📝 <b>Notas:</b> ${order.notes}\n` : ""}
🗺️ <a href="https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}">Ver en Google Maps</a>

⏰ ${new Date().toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"})}

━━━━━━━━━━━━━━━━
👉 <a href="${appLink}">Abrir App Domiciliarios</a>`;
}

// ============ VERIFICAR LOGIN ============
const currentUser = JSON.parse(sessionStorage.getItem('sipoteUser'));

if (!currentUser) {
    window.location.href = 'login.html';
}

// Mostrar info del usuario
if (currentUser) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.textContent = currentUser.name || currentUser.username;

    // Mostrar opciones de admin si es admin
    if (currentUser.role === 'admin') {
        document.body.classList.add('is-admin');
    }
}

function logout() {
    sessionStorage.removeItem('sipoteUser');
    window.location.href = 'login.html';
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'success') {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'linear-gradient(135deg, #6bcb77, #4ade80)' :
                    type === 'error' ? 'linear-gradient(135deg, #ff6b6b, #ee5a5a)' :
                    'linear-gradient(135deg, #ffd93d, #ffcd00)';

    toast.style.cssText = `
        background: ${bgColor};
        color: ${type === 'warning' ? '#333' : 'white'};
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        font-size: 0.95em;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInToast 0.3s ease;
        max-width: 320px;
    `;

    const icons = { success: '&#10003;', error: '&#10007;', warning: '&#9888;' };
    toast.innerHTML = '<span style="font-size:1.3em">' + (icons[type] || icons.success) + '</span> ' + message;

    // Agregar estilos de animacion
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = '@keyframes slideInToast { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutToast { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutToast 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let allProducts = [];
let allOrders = [];
let allOffers = [];
let allSellers = [];
let allDomiciliarios = [];
let currentOrderFilter = "all";

// Navegacion de tabs
document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.section).classList.add("active");
    });
});

// Mostrar fecha actual
function updateDate() {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const el = document.getElementById("current-date");
    if (el) el.textContent = now.toLocaleDateString("es-CO", options);
}
updateDate();

// ============ DASHBOARD ============
async function loadDashboard() {
    const { data: products } = await supabase.from("products").select("*");
    if (products) {
        allProducts = products;
        document.getElementById("total-productos").textContent = products.length;
    }

    const { data: orders } = await supabase.from("orders").select("*");
    if (orders) {
        allOrders = orders;
        const today = new Date().toISOString().split("T")[0];
        const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(today));
        document.getElementById("pedidos-hoy").textContent = todayOrders.length;

        const deliveryToday = todayOrders.filter(o => o.order_type === "domicilio" || o.delivery_address);
        document.getElementById("domicilios-hoy").textContent = deliveryToday.length;

        const salesOnline = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
        document.getElementById("ventas-online").textContent = "$" + salesOnline.toLocaleString("es-CO");
    }

    const { data: sales } = await supabase.from("pos_sales").select("*");
    if (sales) {
        const today = new Date().toISOString().split("T")[0];
        const month = new Date().toISOString().slice(0, 7);

        const todaySales = sales.filter(s => s.created_at && s.created_at.startsWith(today));
        const monthSales = sales.filter(s => s.created_at && s.created_at.startsWith(month));

        const ventasHoy = todaySales.reduce((s, x) => s + Number(x.total || 0), 0);
        const ventasMes = monthSales.reduce((s, x) => s + Number(x.total || 0), 0);

        document.getElementById("ventas-hoy").textContent = "$" + ventasHoy.toLocaleString("es-CO");
        document.getElementById("ventas-mes").textContent = "$" + ventasMes.toLocaleString("es-CO");
        document.getElementById("ventas-pos").textContent = "$" + ventasMes.toLocaleString("es-CO");
    }

    loadRecentOrders();
}

async function loadRecentOrders() {
    const container = document.getElementById("recent-orders-list");
    if (!allOrders || allOrders.length === 0) {
        container.innerHTML = "<p style='color:#666;text-align:center;padding:20px'>No hay pedidos recientes</p>";
        return;
    }

    const recent = allOrders.slice(-5).reverse();
    container.innerHTML = recent.map(o => {
        const time = o.created_at ? new Date(o.created_at).toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"}) : "";
        return "<div style='display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #eee'>" +
            "<div><strong>#" + o.id + "</strong> <span style='color:#666'>" + time + "</span></div>" +
            "<div>$" + Number(o.total || 0).toLocaleString("es-CO") + "</div>" +
            "<span class='order-status " + (o.status || "nuevo") + "'>" + (o.status || "nuevo") + "</span>" +
        "</div>";
    }).join("");
}

// ============ PRODUCTOS ============
async function loadProducts() {
    const { data } = await supabase.from("products").select("*");
    if (!data) return;

    allProducts = data;
    const tbody = document.getElementById("products-table-body");

    tbody.innerHTML = data.map(p => {
        const statusClass = p.available ? "active" : "inactive";
        const statusText = p.available ? "Activo" : "Inactivo";
        return "<tr>" +
            "<td><img src='" + (p.image_url || "https://via.placeholder.com/50") + "' onerror=\"this.src='https://via.placeholder.com/50'\"></td>" +
            "<td><strong>" + p.name + "</strong></td>" +
            "<td>$" + Number(p.price).toLocaleString("es-CO") + "</td>" +
            "<td>" + (p.category || "-") + "</td>" +
            "<td>" + (p.stock || "N/A") + "</td>" +
            "<td><span class='status-badge " + statusClass + "'>" + statusText + "</span></td>" +
            "<td>" +
                "<button class='btn-edit' onclick='editProduct(" + p.id + ")'>Editar</button>" +
                "<button class='btn-delete' onclick='deleteProduct(" + p.id + ")'>X</button>" +
            "</td>" +
        "</tr>";
    }).join("");

    loadFeaturedSection();
}

function showProductForm(product) {
    document.getElementById("product-modal").classList.add("active");
    document.getElementById("product-modal-title").textContent = product ? "Editar Producto" : "Nuevo Producto";

    // Limpiar preview primero
    clearImagePreview();

    if (product) {
        document.getElementById("product-id").value = product.id;
        document.getElementById("product-name").value = product.name;
        document.getElementById("product-description").value = product.description || "";
        document.getElementById("product-price").value = product.price;
        document.getElementById("product-category").value = product.category || "malteadas";
        document.getElementById("product-stock").value = product.stock || 100;
        document.getElementById("product-image").value = product.image_url || "";
        document.getElementById("product-image-url").value = product.image_url || "";
        document.getElementById("product-available").checked = product.available;
        document.getElementById("product-featured").checked = product.featured || false;

        // Mostrar preview si hay imagen
        if (product.image_url) {
            setImagePreview(product.image_url);
        }
    } else {
        document.getElementById("product-form").reset();
        document.getElementById("product-id").value = "";
        document.getElementById("product-available").checked = true;
    }
}

function editProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (product) showProductForm(product);
}

async function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById("product-id").value;
    const product = {
        name: document.getElementById("product-name").value,
        description: document.getElementById("product-description").value,
        price: parseFloat(document.getElementById("product-price").value),
        category: document.getElementById("product-category").value,
        stock: parseInt(document.getElementById("product-stock").value) || 100,
        image_url: document.getElementById("product-image").value,
        available: document.getElementById("product-available").checked,
        featured: document.getElementById("product-featured").checked
    };

    let result;
    if (id) {
        result = await supabase.from("products").update(product).eq("id", id);
    } else {
        result = await supabase.from("products").insert([product]);
    }

    if (result.error) {
        alert("Error al guardar: " + result.error.message);
        return;
    }

    closeModal("product-modal");
    loadProducts();
    loadDashboard();
}

async function deleteProduct(id) {
    if (!confirm("Eliminar este producto?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }
    loadProducts();
}

// ============ DESTACADOS ============
function loadFeaturedSection() {
    const currentContainer = document.getElementById("current-featured");
    const availableContainer = document.getElementById("available-products");
    const previewContainer = document.getElementById("featured-preview");

    const featured = allProducts.filter(p => p.featured);
    const notFeatured = allProducts.filter(p => !p.featured && p.available);

    if (featured.length === 0) {
        currentContainer.innerHTML = "<p style='color:#666;text-align:center;grid-column:1/-1'>No hay productos destacados</p>";
    } else {
        currentContainer.innerHTML = featured.map(p =>
            "<div class='featured-item'>" +
                "<button class='remove-btn' onclick='toggleFeatured(" + p.id + ", false)'>X</button>" +
                "<img src='" + (p.image_url || "https://via.placeholder.com/80") + "' onerror=\"this.src='https://via.placeholder.com/80'\">" +
                "<h4>" + p.name + "</h4>" +
            "</div>"
        ).join("");
    }

    availableContainer.innerHTML = notFeatured.map(p =>
        "<div class='product-list-item'>" +
            "<img src='" + (p.image_url || "https://via.placeholder.com/50") + "' onerror=\"this.src='https://via.placeholder.com/50'\">" +
            "<div class='info'>" +
                "<h4>" + p.name + "</h4>" +
                "<span>$" + Number(p.price).toLocaleString("es-CO") + "</span>" +
            "</div>" +
            (featured.length < 4 ? "<button class='add-btn' onclick='toggleFeatured(" + p.id + ", true)'>+</button>" : "") +
        "</div>"
    ).join("");

    // Renderizar preview igual que en index.html
    if (previewContainer) {
        if (featured.length === 0) {
            previewContainer.innerHTML = "<div class='preview-empty'><span>&#127846;</span>Selecciona productos destacados arriba<br>para ver como se veran en la tienda</div>";
        } else {
            previewContainer.innerHTML = featured.map(p => {
                const img = p.image_url || "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400";
                return "<div class='preview-product-card'>" +
                    "<span class='badge-featured'>Destacado</span>" +
                    "<img src='" + img + "' alt='" + p.name + "' onerror=\"this.src='https://via.placeholder.com/300x150?text=Sipote'\">" +
                    "<div class='product-info'>" +
                        "<h4>" + p.name + "</h4>" +
                        "<p class='product-price'>$" + Number(p.price).toLocaleString("es-CO") + "</p>" +
                        "<button class='add-cart-btn'>Agregar al Carrito</button>" +
                    "</div>" +
                "</div>";
            }).join("");
        }
    }
}

async function toggleFeatured(id, featured) {
    const product = allProducts.find(p => p.id === id);
    const { error } = await supabase.from("products").update({ featured: featured }).eq("id", id);
    if (error) {
        showToast("Error: " + error.message, "error");
        return;
    }
    const productName = product ? product.name : "Producto";
    if (featured) {
        showToast(productName + " agregado a destacados", "success");
    } else {
        showToast(productName + " quitado de destacados", "warning");
    }
    loadProducts();
}

// ============ OFERTAS ============
const milkshakeGradients = [
    'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 50%, #ffd93d 100%)',
    'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f472b6 100%)',
    'linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #38bdf8 100%)',
    'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
    'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)'
];

async function loadOffers() {
    const { data } = await supabase.from("offers").select("*");
    allOffers = data || [];

    const container = document.getElementById("offers-grid");
    const previewTrack = document.getElementById("offers-preview-track");
    const previewDots = document.getElementById("offers-preview-dots");

    if (!data || data.length === 0) {
        container.innerHTML = "<p style='color:#666;text-align:center;grid-column:1/-1;padding:40px'>No hay ofertas creadas</p>";
        if (previewTrack) {
            previewTrack.innerHTML = "<div class='preview-slider-empty'><span>&#127846;</span>Crea ofertas arriba para ver<br>como se veran en el slider</div>";
        }
        if (previewDots) previewDots.innerHTML = "";
        return;
    }

    container.innerHTML = data.map(o => {
        const product = allProducts.find(p => p.id === o.product_id);
        const imgUrl = o.image_url || (product ? product.image_url : "") || "https://via.placeholder.com/300x150";

        return "<div class='offer-card'>" +
            "<img src='" + imgUrl + "' onerror=\"this.src='https://via.placeholder.com/300x150'\">" +
            "<div class='offer-info'>" +
                "<h3>" + o.name + "</h3>" +
                "<span class='discount'>-" + o.discount_percentage + "%</span>" +
                "<p class='dates'>Del " + o.start_date + " al " + o.end_date + "</p>" +
            "</div>" +
            "<div class='offer-actions'>" +
                "<button class='btn-edit' onclick='editOffer(" + o.id + ")'>Editar</button>" +
                "<button class='btn-delete' onclick='deleteOffer(" + o.id + ")'>Eliminar</button>" +
            "</div>" +
        "</div>";
    }).join("");

    // Renderizar preview del slider
    if (previewTrack && previewDots) {
        const activeOffers = data.filter(o => o.available !== false);

        if (activeOffers.length === 0) {
            previewTrack.innerHTML = "<div class='preview-slider-empty'><span>&#127846;</span>No hay ofertas activas<br>Activa alguna oferta para verla aqui</div>";
            previewDots.innerHTML = "";
        } else {
            previewTrack.innerHTML = activeOffers.map((o, idx) => {
                const product = allProducts.find(p => p.id === o.product_id);
                const hasImage = o.image_url || (product && product.image_url);
                const bgStyle = hasImage
                    ? "background-image:url(" + (o.image_url || product.image_url) + ")"
                    : "background:" + milkshakeGradients[idx % milkshakeGradients.length];
                const emoji = !hasImage ? '<span style="font-size:2.5em;display:block;margin-bottom:8px">&#127846;</span>' : '';
                const price = product ? Math.round(product.price * (1 - o.discount_percentage / 100)) : 0;

                return "<div class='preview-offer-slide' style='" + bgStyle + "'>" +
                    "<span class='discount-badge'>-" + o.discount_percentage + "%</span>" +
                    "<div class='offer-content'>" +
                        emoji +
                        "<h3>" + o.name + "</h3>" +
                        "<p>" + (o.description || (product ? product.name : "")) + "</p>" +
                        (price ? "<button class='offer-btn'>$" + Number(price).toLocaleString("es-CO") + " - Pedir</button>" : "") +
                    "</div>" +
                "</div>";
            }).join("");

            previewDots.innerHTML = activeOffers.map((_, i) =>
                "<div class='dot" + (i === 0 ? " active" : "") + "' onclick='previewSlide(" + i + ")'></div>"
            ).join("");
        }
    }
}

let currentPreviewSlide = 0;
function previewSlide(index) {
    currentPreviewSlide = index;
    const track = document.getElementById("offers-preview-track");
    const dots = document.querySelectorAll("#offers-preview-dots .dot");

    if (track) {
        track.style.transform = "translateX(-" + (index * 100) + "%)";
    }

    dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
    });
}

function showOfferForm(offer) {
    document.getElementById("offer-modal").classList.add("active");

    // Limpiar preview primero
    clearOfferImagePreview();

    // Llenar select de productos
    const select = document.getElementById("offer-product");
    select.innerHTML = allProducts.map(p => "<option value='" + p.id + "'>" + p.name + "</option>").join("");

    if (offer) {
        document.getElementById("offer-id").value = offer.id;
        document.getElementById("offer-name").value = offer.name;
        document.getElementById("offer-description").value = offer.description || "";
        document.getElementById("offer-product").value = offer.product_id;
        document.getElementById("offer-discount").value = offer.discount_percentage;
        document.getElementById("offer-start").value = offer.start_date;
        document.getElementById("offer-end").value = offer.end_date;
        document.getElementById("offer-image").value = offer.image_url || "";
        document.getElementById("offer-image-url").value = offer.image_url || "";
        document.getElementById("offer-active").checked = offer.available;

        // Mostrar preview si hay imagen
        if (offer.image_url) {
            setOfferImagePreview(offer.image_url);
        }
    } else {
        document.getElementById("offer-form").reset();
        document.getElementById("offer-id").value = "";
        document.getElementById("offer-active").checked = true;

        // Fechas por defecto
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0];
        document.getElementById("offer-start").value = today;
        document.getElementById("offer-end").value = nextWeek;
    }
}

function editOffer(id) {
    const offer = allOffers.find(o => o.id === id);
    if (offer) showOfferForm(offer);
}

async function saveOffer(e) {
    e.preventDefault();

    const id = document.getElementById("offer-id").value;
    const offer = {
        name: document.getElementById("offer-name").value,
        description: document.getElementById("offer-description").value,
        product_id: parseInt(document.getElementById("offer-product").value),
        discount_percentage: parseInt(document.getElementById("offer-discount").value),
        start_date: document.getElementById("offer-start").value,
        end_date: document.getElementById("offer-end").value,
        image_url: document.getElementById("offer-image").value,
        available: document.getElementById("offer-active").checked
    };

    let result;
    if (id) {
        result = await supabase.from("offers").update(offer).eq("id", id);
    } else {
        result = await supabase.from("offers").insert([offer]);
    }

    if (result.error) {
        alert("Error: " + result.error.message);
        return;
    }

    closeModal("offer-modal");
    loadOffers();
}

async function deleteOffer(id) {
    if (!confirm("Eliminar esta oferta?")) return;

    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }
    loadOffers();
}

// ============ DOMICILIOS ============
async function loadDeliveries() {
    const { data: orders } = await supabase.from("orders").select("*");
    if (!orders) return;

    // Filtrar solo domicilios (tienen delivery_address o order_type = domicilio)
    const deliveries = orders.filter(o => o.delivery_address || o.order_type === "domicilio");
    const today = new Date().toISOString().split("T")[0];
    const todayDeliveries = deliveries.filter(o => o.created_at && o.created_at.startsWith(today));

    // Separar por estado
    const newOrders = todayDeliveries.filter(o => o.status === "nuevo" || o.status === "pendiente");
    const preparing = todayDeliveries.filter(o => o.status === "preparando");
    const onWay = todayDeliveries.filter(o => o.status === "en_camino");
    const delivered = todayDeliveries.filter(o => o.status === "entregado");

    // Actualizar contadores
    document.getElementById("delivery-pending").textContent = newOrders.length + " Pendientes";
    document.getElementById("delivery-active").textContent = onWay.length + " En camino";

    // Renderizar columnas
    renderDeliveryColumn("delivery-new", newOrders, "new");
    renderDeliveryColumn("delivery-preparing", preparing, "preparing");
    renderDeliveryColumn("delivery-onway", onWay, "onway");
    renderDeliveryColumn("delivery-done", delivered, "done");
}

function renderDeliveryColumn(containerId, orders, type) {
    const container = document.getElementById(containerId);

    if (orders.length === 0) {
        container.innerHTML = "<p style='color:#999;text-align:center;padding:20px'>Sin pedidos</p>";
        return;
    }

    container.innerHTML = orders.map(o => {
        let actions = "";
        let telegramBtn = "<button class='btn-action telegram' onclick='notifyTelegram(" + o.id + ")' title='Notificar por Telegram'>📱</button>";

        if (type === "new") {
            actions = "<button class='btn-action prepare' onclick='updateDeliveryStatus(" + o.id + ", \"preparando\")'>Preparar</button>" + telegramBtn;
        } else if (type === "preparing") {
            actions = "<button class='btn-action send' onclick='showAsignarDomiciliario(" + o.id + ")'>Enviar</button>" + telegramBtn;
        } else if (type === "onway") {
            actions = "<button class='btn-action complete' onclick='marcarEntregado(" + o.id + ")'>Entregado</button>";
        }

        const domiciliarioInfo = o.domiciliario_name ? "<div class='domiciliario-assigned'>🛵 " + o.domiciliario_name + "</div>" : "";

        return "<div class='delivery-card " + type + "'>" +
            "<h4>Pedido #" + o.id + "</h4>" +
            "<div class='address'>" + (o.delivery_address || "Sin direccion") + "</div>" +
            "<div class='phone'>" + (o.customer_phone || "Sin telefono") + "</div>" +
            domiciliarioInfo +
            "<p style='margin-top:8px;color:#ff6b6b;font-weight:bold'>$" + Number(o.total || 0).toLocaleString("es-CO") + "</p>" +
            (actions ? "<div class='actions'>" + actions + "</div>" : "") +
        "</div>";
    }).join("");
}

// Notificar pedido por Telegram
async function notifyTelegram(orderId) {
    const { data: orders } = await supabase.from("orders").select("*").eq("id", orderId);
    if (!orders || orders.length === 0) {
        showToast("Pedido no encontrado", "error");
        return;
    }

    const order = orders[0];
    const message = formatDeliveryMessage(order);
    const sent = await sendTelegramNotification(message);

    if (sent) {
        showToast("Notificacion enviada a Telegram", "success");
    } else {
        showToast("Error al enviar notificacion. Verifica el Chat ID", "error");
    }
}

async function updateDeliveryStatus(id, status) {
    const { error } = await supabase.from("orders").update({ status: status }).eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }

    // Notificar automaticamente cuando se envia a domicilio
    if (status === "en_camino" && TELEGRAM_CHAT_ID) {
        const { data: orders } = await supabase.from("orders").select("*").eq("id", id);
        if (orders && orders.length > 0) {
            const message = `🚀 <b>PEDIDO EN CAMINO</b>\n\n📦 Pedido #${id}\n📍 ${orders[0].delivery_address || "Sin direccion"}\n📞 ${orders[0].customer_phone || "Sin telefono"}\n💰 $${Number(orders[0].total || 0).toLocaleString("es-CO")}`;
            sendTelegramNotification(message);
        }
    }

    loadDeliveries();
    loadDashboard();
}

// ============ PEDIDOS MESA ============
async function loadOrders() {
    const { data } = await supabase.from("orders").select("*");
    if (!data) return;

    // Filtrar solo pedidos de mesa (tienen table_number y NO delivery_address)
    let orders = data.filter(o => o.table_number && !o.delivery_address);

    if (currentOrderFilter !== "all") {
        orders = orders.filter(o => o.status === currentOrderFilter);
    }

    const container = document.getElementById("orders-grid");

    if (orders.length === 0) {
        container.innerHTML = "<p style='color:#666;text-align:center;grid-column:1/-1;padding:40px'>No hay pedidos de mesa</p>";
        return;
    }

    container.innerHTML = orders.reverse().map(o => {
        return "<div class='order-card'>" +
            "<h3>Pedido #" + o.id + " - Mesa " + o.table_number + "</h3>" +
            "<span class='order-status " + (o.status || "nuevo") + "'>" + (o.status || "nuevo") + "</span>" +
            "<p style='font-size:1.3em;margin:10px 0;color:#ff6b6b'>$" + Number(o.total || 0).toLocaleString("es-CO") + "</p>" +
            (o.notes ? "<p style='color:#666;font-size:0.9em'>" + o.notes + "</p>" : "") +
            "<div style='margin-top:15px;display:flex;gap:10px'>" +
                "<button class='btn-edit' onclick='updateOrderStatus(" + o.id + ", \"preparando\")'>Preparar</button>" +
                "<button class='btn-save' style='padding:8px 15px' onclick='updateOrderStatus(" + o.id + ", \"listo\")'>Listo</button>" +
            "</div>" +
        "</div>";
    }).join("");
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentOrderFilter = btn.dataset.status;
        loadOrders();
    });
});

async function updateOrderStatus(id, status) {
    const { error } = await supabase.from("orders").update({ status: status }).eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }
    loadOrders();
    loadDashboard();
}

// ============ VENDEDORES ============
async function loadSellers() {
    const { data } = await supabase.from("sellers").select("*");
    if (!data) return;

    allSellers = data;
    const tbody = document.getElementById("sellers-table-body");
    if (!tbody) return;

    tbody.innerHTML = data.map(s => {
        const statusClass = s.active ? "active" : "inactive";
        const statusText = s.active ? "Activo" : "Inactivo";
        const roleText = s.role === "admin" ? "Admin" : s.role === "cocina" ? "Cocina" : "Vendedor";

        return "<tr>" +
            "<td><strong>" + s.username + "</strong></td>" +
            "<td>" + s.name + "</td>" +
            "<td>" + roleText + "</td>" +
            "<td><span class='status-badge " + statusClass + "'>" + statusText + "</span></td>" +
            "<td>" +
                "<button class='btn-edit' onclick='editSeller(" + s.id + ")'>Editar</button>" +
                "<button class='btn-delete' onclick='deleteSeller(" + s.id + ")'>X</button>" +
            "</td>" +
        "</tr>";
    }).join("");
}

function showSellerForm(seller) {
    document.getElementById("seller-modal").classList.add("active");
    document.getElementById("seller-modal-title").textContent = seller ? "Editar Vendedor" : "Nuevo Vendedor";

    if (seller) {
        document.getElementById("seller-id").value = seller.id;
        document.getElementById("seller-name").value = seller.name;
        document.getElementById("seller-username").value = seller.username;
        document.getElementById("seller-password").value = "";
        document.getElementById("seller-role").value = seller.role || "vendedor";
        document.getElementById("seller-active").checked = seller.active;
    } else {
        document.getElementById("seller-form").reset();
        document.getElementById("seller-id").value = "";
        document.getElementById("seller-active").checked = true;
    }
}

function editSeller(id) {
    const seller = allSellers.find(s => s.id === id);
    if (seller) showSellerForm(seller);
}

async function saveSeller(e) {
    e.preventDefault();

    const id = document.getElementById("seller-id").value;
    const password = document.getElementById("seller-password").value;

    const seller = {
        name: document.getElementById("seller-name").value,
        username: document.getElementById("seller-username").value,
        role: document.getElementById("seller-role").value,
        active: document.getElementById("seller-active").checked
    };

    // Solo actualizar password si se ingreso uno nuevo
    if (password) {
        seller.password = password;
    }

    let result;
    if (id) {
        result = await supabase.from("sellers").update(seller).eq("id", id);
    } else {
        if (!password) {
            alert("La clave es requerida para nuevos vendedores");
            return;
        }
        result = await supabase.from("sellers").insert([seller]);
    }

    if (result.error) {
        alert("Error: " + result.error.message);
        return;
    }

    closeModal("seller-modal");
    loadSellers();
}

async function deleteSeller(id) {
    if (!confirm("Eliminar este vendedor?")) return;

    const { error } = await supabase.from("sellers").delete().eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }
    loadSellers();
}

// ============ DOMICILIARIOS ============
async function loadDomiciliarios() {
    const { data } = await supabase.from("delivery_drivers").select("*");
    allDomiciliarios = data || [];

    const container = document.getElementById("domiciliarios-grid");
    if (!container) return;

    // Actualizar estadisticas
    const activos = allDomiciliarios.filter(d => d.active);
    const disponibles = activos.filter(d => d.status === "disponible");
    const ocupados = activos.filter(d => d.status === "en_ruta");

    const elDisponibles = document.getElementById("domiciliarios-disponibles");
    const elOcupados = document.getElementById("domiciliarios-ocupados");
    const elTotal = document.getElementById("domiciliarios-total");

    if (elDisponibles) elDisponibles.textContent = disponibles.length;
    if (elOcupados) elOcupados.textContent = ocupados.length;
    if (elTotal) elTotal.textContent = activos.length;

    if (allDomiciliarios.length === 0) {
        container.innerHTML = "<p style='color:#666;text-align:center;grid-column:1/-1;padding:40px'>No hay domiciliarios registrados</p>";
        return;
    }

    container.innerHTML = allDomiciliarios.map(d => {
        const isDisponible = d.status === "disponible";
        const statusClass = d.active ? (isDisponible ? "available" : "busy") : "inactive";
        const statusText = d.active ? (isDisponible ? "Disponible" : "En ruta") : "Inactivo";

        return "<div class='domiciliario-card " + statusClass + "'>" +
            "<div class='domiciliario-header'>" +
                "<span class='vehicle-icon'>🛵</span>" +
                "<div class='domiciliario-info'>" +
                    "<h4>" + d.name + "</h4>" +
                    "<span class='phone'>" + (d.phone || "Sin telefono") + "</span>" +
                "</div>" +
                "<span class='status-indicator " + statusClass + "'>" + statusText + "</span>" +
            "</div>" +
            (d.telegram_id ? "<p class='plate'>Telegram: @" + d.telegram_id + "</p>" : "") +
            "<div class='domiciliario-actions'>" +
                (d.active && !isDisponible ? "<button class='btn-action available' onclick='toggleDomiciliarioAvailable(" + d.id + ", true)'>Marcar Disponible</button>" : "") +
                "<button class='btn-edit' onclick='editDomiciliario(" + d.id + ")'>Editar</button>" +
                "<button class='btn-delete' onclick='deleteDomiciliario(" + d.id + ")'>X</button>" +
            "</div>" +
        "</div>";
    }).join("");
}

function showDomiciliarioForm(domiciliario) {
    document.getElementById("domiciliario-modal").classList.add("active");
    document.getElementById("domiciliario-modal-title").textContent = domiciliario ? "Editar Domiciliario" : "Nuevo Domiciliario";

    if (domiciliario) {
        document.getElementById("domiciliario-id").value = domiciliario.id;
        document.getElementById("domiciliario-name").value = domiciliario.name;
        document.getElementById("domiciliario-phone").value = domiciliario.phone || "";
        document.getElementById("domiciliario-telegram").value = domiciliario.telegram_id || "";
        document.getElementById("domiciliario-active").checked = domiciliario.active;
    } else {
        document.getElementById("domiciliario-form").reset();
        document.getElementById("domiciliario-id").value = "";
        document.getElementById("domiciliario-active").checked = true;
    }
}

function editDomiciliario(id) {
    const domiciliario = allDomiciliarios.find(d => d.id === id);
    if (domiciliario) showDomiciliarioForm(domiciliario);
}

async function saveDomiciliario(e) {
    e.preventDefault();

    const id = document.getElementById("domiciliario-id").value;
    const domiciliario = {
        name: document.getElementById("domiciliario-name").value,
        phone: document.getElementById("domiciliario-phone").value,
        telegram_id: document.getElementById("domiciliario-telegram").value || null,
        active: document.getElementById("domiciliario-active").checked
    };

    // Si es nuevo, agregar status por defecto
    if (!id) {
        domiciliario.status = "disponible";
    }

    let result;
    if (id) {
        result = await supabase.from("delivery_drivers").update(domiciliario).eq("id", id);
    } else {
        result = await supabase.from("delivery_drivers").insert([domiciliario]);
    }

    if (result.error) {
        alert("Error: " + result.error.message);
        return;
    }

    showToast(id ? "Domiciliario actualizado" : "Domiciliario creado", "success");
    closeModal("domiciliario-modal");
    loadDomiciliarios();
}

async function deleteDomiciliario(id) {
    if (!confirm("Eliminar este domiciliario?")) return;

    const { error } = await supabase.from("delivery_drivers").delete().eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }
    showToast("Domiciliario eliminado", "warning");
    loadDomiciliarios();
}

async function toggleDomiciliarioAvailable(id, available) {
    const newStatus = available ? "disponible" : "en_ruta";
    const { error } = await supabase.from("delivery_drivers").update({ status: newStatus, current_order_id: null }).eq("id", id);
    if (error) {
        alert("Error: " + error.message);
        return;
    }
    showToast(available ? "Domiciliario disponible" : "Domiciliario en ruta", "success");
    loadDomiciliarios();
}

// Mostrar modal para asignar domiciliario
function showAsignarDomiciliario(orderId) {
    document.getElementById("asignar-modal").classList.add("active");
    document.getElementById("asignar-pedido-id").textContent = orderId;

    const container = document.getElementById("domiciliarios-disponibles-list");
    const disponibles = allDomiciliarios.filter(d => d.active && d.status === "disponible");

    if (disponibles.length === 0) {
        container.innerHTML = "<p style='color:#999;text-align:center;padding:20px'>No hay domiciliarios disponibles</p>";
        return;
    }

    container.innerHTML = disponibles.map(d => {
        return "<div class='domiciliario-option' onclick='asignarYEnviar(" + orderId + ", " + d.id + ")'>" +
            "<span class='vehicle-icon'>🛵</span>" +
            "<div class='info'>" +
                "<strong>" + d.name + "</strong>" +
                "<span>" + (d.phone || "") + "</span>" +
            "</div>" +
            "<span class='select-icon'>&#10003;</span>" +
        "</div>";
    }).join("");
}

async function asignarYEnviar(orderId, domiciliarioId) {
    const domiciliario = allDomiciliarios.find(d => d.id === domiciliarioId);

    // Actualizar pedido con domiciliario asignado y cambiar estado
    const { error: orderError } = await supabase.from("orders").update({
        status: "en_camino",
        domiciliario_id: domiciliarioId,
        domiciliario_name: domiciliario ? domiciliario.name : null
    }).eq("id", orderId);

    if (orderError) {
        alert("Error al asignar: " + orderError.message);
        return;
    }

    // Marcar domiciliario como ocupado
    await supabase.from("delivery_drivers").update({ status: "en_ruta", current_order_id: orderId }).eq("id", domiciliarioId);

    // Notificar por Telegram
    if (TELEGRAM_CHAT_ID) {
        const { data: orders } = await supabase.from("orders").select("*").eq("id", orderId);
        if (orders && orders.length > 0) {
            const order = orders[0];
            const message = `🚀 <b>PEDIDO EN CAMINO</b>

📦 Pedido #${orderId}
🛵 Domiciliario: <b>${domiciliario ? domiciliario.name : "Sin asignar"}</b>
📞 Tel: ${domiciliario ? domiciliario.phone : "N/A"}

📍 ${order.delivery_address || "Sin direccion"}
📞 Cliente: ${order.customer_phone || "Sin telefono"}
💰 $${Number(order.total || 0).toLocaleString("es-CO")}`;
            sendTelegramNotification(message);
        }
    }

    showToast("Pedido asignado a " + (domiciliario ? domiciliario.name : "domiciliario"), "success");
    closeModal("asignar-modal");
    loadDeliveries();
    loadDomiciliarios();
}

// Marcar pedido como entregado y liberar domiciliario
async function marcarEntregado(orderId) {
    // Obtener el pedido para saber el domiciliario
    const { data: orders } = await supabase.from("orders").select("*").eq("id", orderId);
    const order = orders && orders.length > 0 ? orders[0] : null;

    // Actualizar estado del pedido
    const { error } = await supabase.from("orders").update({ status: "entregado" }).eq("id", orderId);
    if (error) {
        alert("Error: " + error.message);
        return;
    }

    // Liberar al domiciliario
    if (order && order.domiciliario_id) {
        await supabase.from("delivery_drivers").update({ status: "disponible", current_order_id: null }).eq("id", order.domiciliario_id);
    }

    // Notificar por Telegram
    if (TELEGRAM_CHAT_ID && order) {
        const message = `✅ <b>PEDIDO ENTREGADO</b>

📦 Pedido #${orderId}
📍 ${order.delivery_address || "Sin direccion"}
💰 $${Number(order.total || 0).toLocaleString("es-CO")}
${order.domiciliario_name ? "🛵 " + order.domiciliario_name : ""}

⏰ ${new Date().toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"})}`;
        sendTelegramNotification(message);
    }

    showToast("Pedido marcado como entregado", "success");
    loadDeliveries();
    loadDomiciliarios();
    loadDashboard();
}

// ============ MODALES ============
function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) modal.classList.remove("active");
    });
});

// ============ IMAGE UPLOAD ============
// IMGBB_API_KEY se carga desde config.js

function setupImageDropZone() {
    const dropZone = document.getElementById("image-drop-zone");
    const fileInput = document.getElementById("product-image-file");
    const preview = document.getElementById("image-preview");
    const dropText = document.getElementById("drop-text");
    const urlInput = document.getElementById("product-image-url");
    const hiddenInput = document.getElementById("product-image");

    if (!dropZone) return;

    // Click para seleccionar archivo
    dropZone.addEventListener("click", (e) => {
        if (e.target.closest(".remove-preview")) return;
        fileInput.click();
    });

    // Drag events
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            uploadImage(file);
        }
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) uploadImage(file);
    });

    // URL input change
    urlInput.addEventListener("input", () => {
        const url = urlInput.value.trim();
        if (url) {
            setImagePreview(url);
            hiddenInput.value = url;
        }
    });
}

async function uploadImage(file) {
    const dropZone = document.getElementById("image-drop-zone");
    const preview = document.getElementById("image-preview");
    const dropText = document.getElementById("drop-text");
    const hiddenInput = document.getElementById("product-image");
    const urlInput = document.getElementById("product-image-url");

    dropZone.classList.add("uploading");
    dropText.innerHTML = '<span style="font-size:2em">&#8987;</span><br>Subiendo imagen...';

    try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        console.log("ImgBB Response:", data);

        if (data.success) {
            const imageUrl = data.data.url;
            setImagePreview(imageUrl);
            hiddenInput.value = imageUrl;
            urlInput.value = imageUrl;
            showToast("Imagen subida correctamente", "success");
        } else {
            const errorMsg = data.error ? data.error.message : "Error desconocido";
            console.error("ImgBB Error:", data);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error("Upload error:", error);
        showToast("Error al subir imagen: " + error.message, "error");
        dropText.innerHTML = '<span style="font-size:2em">&#128247;</span><br>Arrastra una imagen aqui<br><small>o haz clic para seleccionar</small>';
    }

    dropZone.classList.remove("uploading");
}

function setImagePreview(url) {
    const preview = document.getElementById("image-preview");
    const dropText = document.getElementById("drop-text");

    preview.innerHTML = '<img src="' + url + '" onerror="clearImagePreview()"><button type="button" class="remove-preview" onclick="clearImagePreview()">X</button>';
    preview.classList.add("has-image");
    dropText.style.display = "none";
}

function clearImagePreview() {
    const preview = document.getElementById("image-preview");
    const dropText = document.getElementById("drop-text");
    const hiddenInput = document.getElementById("product-image");
    const urlInput = document.getElementById("product-image-url");

    preview.innerHTML = "";
    preview.classList.remove("has-image");
    dropText.style.display = "block";
    dropText.innerHTML = '<span style="font-size:2em">&#128247;</span><br>Arrastra una imagen aqui<br><small>o haz clic para seleccionar</small>';
    hiddenInput.value = "";
    urlInput.value = "";
}

// ============ OFFER IMAGE UPLOAD ============
function setupOfferImageDropZone() {
    const dropZone = document.getElementById("offer-image-drop-zone");
    const fileInput = document.getElementById("offer-image-file");
    const urlInput = document.getElementById("offer-image-url");
    const hiddenInput = document.getElementById("offer-image");

    if (!dropZone) return;

    // Click para seleccionar archivo
    dropZone.addEventListener("click", (e) => {
        if (e.target.closest(".remove-preview")) return;
        fileInput.click();
    });

    // Drag events
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            uploadOfferImage(file);
        }
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) uploadOfferImage(file);
    });

    // URL input change
    urlInput.addEventListener("input", () => {
        const url = urlInput.value.trim();
        if (url) {
            setOfferImagePreview(url);
            hiddenInput.value = url;
        }
    });
}

async function uploadOfferImage(file) {
    const dropZone = document.getElementById("offer-image-drop-zone");
    const dropText = document.getElementById("offer-drop-text");
    const hiddenInput = document.getElementById("offer-image");
    const urlInput = document.getElementById("offer-image-url");

    dropZone.classList.add("uploading");
    dropText.innerHTML = '<span style="font-size:2em">&#8987;</span><br>Subiendo imagen...';

    try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        console.log("ImgBB Offer Response:", data);

        if (data.success) {
            const imageUrl = data.data.url;
            setOfferImagePreview(imageUrl);
            hiddenInput.value = imageUrl;
            urlInput.value = imageUrl;
            showToast("Imagen subida correctamente", "success");
        } else {
            const errorMsg = data.error ? data.error.message : "Error desconocido";
            console.error("ImgBB Offer Error:", data);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error("Offer upload error:", error);
        showToast("Error al subir imagen: " + error.message, "error");
        dropText.innerHTML = '<span style="font-size:2em">&#128247;</span><br>Arrastra una imagen aqui<br><small>o haz clic para seleccionar</small>';
    }

    dropZone.classList.remove("uploading");
}

function setOfferImagePreview(url) {
    const preview = document.getElementById("offer-image-preview");
    const dropText = document.getElementById("offer-drop-text");

    preview.innerHTML = '<img src="' + url + '" onerror="clearOfferImagePreview()"><button type="button" class="remove-preview" onclick="clearOfferImagePreview()">X</button>';
    preview.classList.add("has-image");
    dropText.style.display = "none";
}

function clearOfferImagePreview() {
    const preview = document.getElementById("offer-image-preview");
    const dropText = document.getElementById("offer-drop-text");
    const hiddenInput = document.getElementById("offer-image");
    const urlInput = document.getElementById("offer-image-url");

    preview.innerHTML = "";
    preview.classList.remove("has-image");
    dropText.style.display = "block";
    dropText.innerHTML = '<span style="font-size:2em">&#128247;</span><br>Arrastra una imagen aqui<br><small>o haz clic para seleccionar</small>';
    hiddenInput.value = "";
    if (urlInput) urlInput.value = "";
}

// ============ MAPA DE TRACKING ============
let trackingMap = null;
let driverMarkers = {};

function initTrackingMap() {
    const mapContainer = document.getElementById("tracking-map");
    if (!mapContainer || trackingMap) return;

    // Centrar en Villavicencio, Colombia
    trackingMap = L.map("tracking-map").setView([4.1420, -73.6266], 13);

    // Capa de OpenStreetMap (gratuito)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap'
    }).addTo(trackingMap);

    // Marcador del restaurante
    const restaurantIcon = L.divIcon({
        className: 'driver-marker',
        html: '🏪',
        iconSize: [35, 35],
        iconAnchor: [17, 17]
    });

    L.marker([4.1420, -73.6266], { icon: restaurantIcon })
        .addTo(trackingMap)
        .bindPopup("<b>Sipote Malteada</b><br>Sede Principal");

    // Cargar ubicaciones de domiciliarios
    updateMapMarkers();
}

async function updateMapMarkers() {
    if (!trackingMap) return;

    // Limpiar marcadores existentes
    Object.values(driverMarkers).forEach(marker => {
        trackingMap.removeLayer(marker);
    });
    driverMarkers = {};

    // Obtener domiciliarios con ubicacion
    const driversWithLocation = allDomiciliarios.filter(d =>
        d.active && d.latitude && d.longitude
    );

    driversWithLocation.forEach(driver => {
        const isAvailable = driver.status === "disponible";
        const emoji = isAvailable ? "🟢" : "🔵";

        const icon = L.divIcon({
            className: 'driver-marker',
            html: `<div style="position:relative">🛵<span style="position:absolute;top:-5px;right:-5px;font-size:0.6em">${emoji}</span></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const lastUpdate = driver.last_location_update
            ? new Date(driver.last_location_update).toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"})
            : "Desconocido";

        const statusClass = isAvailable ? "available" : "busy";
        const statusText = isAvailable ? "Disponible" : "En ruta";

        const marker = L.marker([driver.latitude, driver.longitude], { icon })
            .addTo(trackingMap)
            .bindPopup(`
                <div class="driver-popup">
                    <h4>${driver.name}</h4>
                    <span class="status ${statusClass}">${statusText}</span>
                    <p class="last-update">Ultima actualizacion: ${lastUpdate}</p>
                    <a href="tel:${driver.phone}" style="color:#25D366">${driver.phone}</a>
                </div>
            `);

        driverMarkers[driver.id] = marker;
    });

    // Si hay domiciliarios, ajustar vista para mostrarlos
    if (driversWithLocation.length > 0) {
        const bounds = L.latLngBounds(driversWithLocation.map(d => [d.latitude, d.longitude]));
        // Agregar el restaurante al bounds
        bounds.extend([4.1420, -73.6266]);
        trackingMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

function refreshMap() {
    loadDomiciliarios().then(() => {
        updateMapMarkers();
        showToast("Mapa actualizado", "success");
    });
}

// ============ INICIALIZACION ============
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadProducts();
    loadOffers();
    loadDeliveries();
    loadOrders();
    loadDomiciliarios();
    setupImageDropZone();
    setupOfferImageDropZone();

    // Inicializar mapa cuando se cargue la seccion
    setTimeout(initTrackingMap, 500);

    // Cargar vendedores solo si es admin
    if (currentUser && currentUser.role === "admin") {
        loadSellers();
    }

    // Actualizar cada 30 segundos
    setInterval(() => {
        loadDashboard();
        loadDeliveries();
        loadOrders();
        loadDomiciliarios();
        updateMapMarkers();
    }, 30000);
});
