// App Domiciliarios - Sipote Malteada
// Aplicacion para repartidores

let currentDriver = null;
let currentOrder = null;
let locationWatchId = null;
let pendingOrderId = null;

// ============ TOAST ============
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ LOGIN ============
async function loginDriver(e) {
    e.preventDefault();

    const phone = document.getElementById("driver-phone").value.replace(/\s/g, "");
    const pin = document.getElementById("driver-pin").value;

    // Buscar domiciliario por telefono
    const { data: drivers, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("phone", phone);

    if (error || !drivers || drivers.length === 0) {
        showToast("Telefono no registrado", "error");
        return;
    }

    const driver = drivers[0];

    // Verificar PIN (ultimos 4 digitos de cedula - guardado en telegram_id temporalmente o como PIN)
    // Por ahora usamos un PIN simple: 1234 para todos o los ultimos 4 del telefono
    const expectedPin = driver.pin || phone.slice(-4);

    if (pin !== expectedPin && pin !== "1234") {
        showToast("PIN incorrecto", "error");
        return;
    }

    if (!driver.active) {
        showToast("Tu cuenta esta desactivada. Contacta al administrador.", "error");
        return;
    }

    // Guardar sesion
    currentDriver = driver;
    localStorage.setItem("sipoteDriver", JSON.stringify(driver));

    // Mostrar app
    showApp();
    showToast(`Bienvenido, ${driver.name}!`, "success");
}

function showApp() {
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("app-screen").classList.add("active");

    document.getElementById("driver-name").textContent = currentDriver.name;
    updateStatusUI();
    loadAvailableOrders();
    loadCurrentOrder();
    loadHistory();

    // Auto-refresh cada 15 segundos
    setInterval(() => {
        loadAvailableOrders();
        loadCurrentOrder();
    }, 15000);
}

function logout() {
    if (confirm("¿Seguro que quieres salir?")) {
        stopLocationTracking();
        localStorage.removeItem("sipoteDriver");
        currentDriver = null;
        currentOrder = null;
        document.getElementById("app-screen").classList.remove("active");
        document.getElementById("login-screen").classList.add("active");
    }
}

// ============ STATUS ============
function updateStatusUI() {
    const isAvailable = currentDriver.status === "disponible";
    const banner = document.getElementById("status-banner");
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    const btnText = document.getElementById("btn-change-status");
    const icon = document.getElementById("status-icon");

    if (isAvailable) {
        banner.classList.remove("busy");
        dot.classList.remove("busy");
        text.textContent = "Disponible";
        btnText.textContent = "Marcar Ocupado";
        icon.textContent = "🟢";
    } else {
        banner.classList.add("busy");
        dot.classList.add("busy");
        text.textContent = "En ruta";
        btnText.textContent = "Marcar Disponible";
        icon.textContent = "🟠";
    }
}

async function toggleStatus() {
    const newStatus = currentDriver.status === "disponible" ? "en_ruta" : "disponible";

    const { error } = await supabase
        .from("delivery_drivers")
        .update({ status: newStatus })
        .eq("id", currentDriver.id);

    if (error) {
        showToast("Error al cambiar estado", "error");
        return;
    }

    currentDriver.status = newStatus;
    localStorage.setItem("sipoteDriver", JSON.stringify(currentDriver));
    updateStatusUI();
    showToast(newStatus === "disponible" ? "Ahora estas disponible" : "Ahora estas ocupado", "success");
}

// ============ TABS ============
function switchTab(tabName) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add("active");
    document.getElementById(`tab-${tabName}`).classList.add("active");

    if (tabName === "disponibles") loadAvailableOrders();
    if (tabName === "mi-pedido") loadCurrentOrder();
    if (tabName === "historial") loadHistory();
}

// ============ PEDIDOS DISPONIBLES ============
async function loadAvailableOrders() {
    const container = document.getElementById("available-orders");

    // Pedidos pendientes de asignar (status: pendiente o preparando, sin domiciliario)
    const { data: orders, error } = await supabase
        .from("orders")
        .select("*");

    if (error) {
        console.error("Error loading orders:", error);
        return;
    }

    // Filtrar pedidos de domicilio sin asignar
    const available = (orders || []).filter(o =>
        o.delivery_address &&
        !o.domiciliario_id &&
        ["pendiente", "preparando", "listo"].includes(o.status)
    );

    // Actualizar badge
    const badge = document.getElementById("badge-disponibles");
    if (available.length > 0) {
        badge.textContent = available.length;
        badge.classList.add("show");
    } else {
        badge.classList.remove("show");
    }

    if (available.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>No hay pedidos disponibles</p>
                <small>Los nuevos pedidos apareceran aqui</small>
            </div>
        `;
        return;
    }

    container.innerHTML = available.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">Pedido #${order.id}</span>
                <span class="order-total">$${Number(order.total || 0).toLocaleString("es-CO")}</span>
            </div>
            <div class="order-address">
                <span class="icon">📍</span>
                <span class="text">${order.delivery_address || "Sin direccion"}</span>
            </div>
            <div class="order-phone">
                <span>📞</span>
                <a href="tel:${order.customer_phone}">${order.customer_phone || "Sin telefono"}</a>
            </div>
            ${order.notes ? `<div class="order-notes">📝 ${order.notes}</div>` : ""}
            <div class="order-time">⏰ ${formatTime(order.created_at)}</div>
            <div class="order-actions">
                <button class="btn-take" onclick="showTakeOrderModal(${order.id})">Tomar Pedido</button>
                <button class="btn-navigate" onclick="openMaps('${encodeURIComponent(order.delivery_address || "")}')">🗺️</button>
            </div>
        </div>
    `).join("");
}

function formatTime(dateStr) {
    if (!dateStr) return "Recien";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function openMaps(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, "_blank");
}

// ============ TOMAR PEDIDO ============
function showTakeOrderModal(orderId) {
    pendingOrderId = orderId;

    const modal = document.getElementById("modal-tomar");
    const details = document.getElementById("modal-tomar-details");

    // Buscar el pedido
    const orderCard = document.querySelector(`.order-card .order-id`);

    details.innerHTML = `
        <p style="text-align:center;margin-bottom:15px">
            <strong style="font-size:1.3em;color:#667eea">Pedido #${orderId}</strong>
        </p>
        <p style="text-align:center;color:#666">
            ¿Estas seguro de tomar este pedido?<br>
            Se notificara al cliente que vas en camino.
        </p>
    `;

    modal.classList.add("active");
}

async function confirmTakeOrder() {
    if (!pendingOrderId) return;

    closeModal("modal-tomar");
    showToast("Asignando pedido...", "info");

    // Obtener datos del pedido
    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("id", pendingOrderId);

    if (!orders || orders.length === 0) {
        showToast("Pedido no encontrado", "error");
        return;
    }

    const order = orders[0];

    // Verificar que no haya sido tomado por otro
    if (order.domiciliario_id) {
        showToast("Este pedido ya fue tomado por otro domiciliario", "warning");
        loadAvailableOrders();
        return;
    }

    // Asignar pedido al domiciliario
    const { error: orderError } = await supabase
        .from("orders")
        .update({
            status: "en_camino",
            domiciliario_id: currentDriver.id,
            domiciliario_name: currentDriver.name
        })
        .eq("id", pendingOrderId);

    if (orderError) {
        showToast("Error al tomar pedido: " + orderError.message, "error");
        return;
    }

    // Marcar domiciliario como ocupado
    await supabase
        .from("delivery_drivers")
        .update({
            status: "en_ruta",
            current_order_id: pendingOrderId
        })
        .eq("id", currentDriver.id);

    currentDriver.status = "en_ruta";
    currentDriver.current_order_id = pendingOrderId;
    localStorage.setItem("sipoteDriver", JSON.stringify(currentDriver));

    // Notificar por Telegram al admin
    await notifyTelegramOrderTaken(order);

    // Enviar WhatsApp al cliente
    sendWhatsAppToCustomer(order, "tomado");

    showToast("Pedido asignado! Ve a 'Mi Pedido'", "success");
    updateStatusUI();
    loadAvailableOrders();
    loadCurrentOrder();
    switchTab("mi-pedido");

    pendingOrderId = null;
}

// ============ MI PEDIDO ACTUAL ============
async function loadCurrentOrder() {
    const container = document.getElementById("current-order-container");

    if (!currentDriver.current_order_id) {
        // Buscar si hay algun pedido asignado a este domiciliario
        const { data: orders } = await supabase
            .from("orders")
            .select("*")
            .eq("domiciliario_id", currentDriver.id)
            .eq("status", "en_camino");

        if (orders && orders.length > 0) {
            currentOrder = orders[0];
            currentDriver.current_order_id = currentOrder.id;
        } else {
            currentOrder = null;
            container.innerHTML = `
                <div class="empty-state">
                    <span>🛵</span>
                    <p>No tienes pedido asignado</p>
                    <small>Toma un pedido de la lista de disponibles</small>
                </div>
            `;
            return;
        }
    } else {
        // Cargar pedido actual
        const { data: orders } = await supabase
            .from("orders")
            .select("*")
            .eq("id", currentDriver.current_order_id);

        if (!orders || orders.length === 0 || orders[0].status === "entregado") {
            currentOrder = null;
            currentDriver.current_order_id = null;
            container.innerHTML = `
                <div class="empty-state">
                    <span>🛵</span>
                    <p>No tienes pedido asignado</p>
                    <small>Toma un pedido de la lista de disponibles</small>
                </div>
            `;
            return;
        }

        currentOrder = orders[0];
    }

    container.innerHTML = `
        <div class="current-order">
            <div class="current-order-header">
                <span class="order-id">Pedido #${currentOrder.id}</span>
                <span class="current-order-status">En camino</span>
            </div>

            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>

            <div class="order-total" style="text-align:center;margin-bottom:20px;background:#ff6b6b;color:white;padding:12px;border-radius:12px;font-size:1.3em">
                $${Number(currentOrder.total || 0).toLocaleString("es-CO")}
            </div>

            <div class="order-address">
                <span class="icon">📍</span>
                <span class="text">${currentOrder.delivery_address || "Sin direccion"}</span>
            </div>

            <div class="order-phone">
                <span>📞</span>
                <a href="tel:${currentOrder.customer_phone}">${currentOrder.customer_phone || "Sin telefono"}</a>
            </div>

            ${currentOrder.notes ? `<div class="order-notes">📝 ${currentOrder.notes}</div>` : ""}

            <div class="current-order-actions">
                <button class="action-btn" onclick="openMaps('${encodeURIComponent(currentOrder.delivery_address || "")}')">
                    <span class="icon">🗺️</span>
                    <span class="label">Navegar</span>
                </button>
                <button class="action-btn" onclick="callCustomer('${currentOrder.customer_phone}')">
                    <span class="icon">📞</span>
                    <span class="label">Llamar</span>
                </button>
                <button class="action-btn" onclick="sendWhatsAppToCustomer(currentOrder, 'llegando')">
                    <span class="icon">💬</span>
                    <span class="label">WhatsApp</span>
                </button>
                <button class="action-btn primary" onclick="showDeliverModal()">
                    <span class="icon">✅</span>
                    <span class="label">Marcar Entregado</span>
                </button>
            </div>
        </div>
    `;
}

function callCustomer(phone) {
    if (phone) {
        window.location.href = `tel:${phone}`;
    } else {
        showToast("No hay telefono del cliente", "warning");
    }
}

// ============ ENTREGAR PEDIDO ============
function showDeliverModal() {
    document.getElementById("modal-entregar").classList.add("active");
}

async function confirmDelivery() {
    if (!currentOrder) return;

    closeModal("modal-entregar");
    showToast("Marcando como entregado...", "info");

    // Actualizar estado del pedido
    const { error } = await supabase
        .from("orders")
        .update({ status: "entregado" })
        .eq("id", currentOrder.id);

    if (error) {
        showToast("Error: " + error.message, "error");
        return;
    }

    // Liberar domiciliario
    await supabase
        .from("delivery_drivers")
        .update({
            status: "disponible",
            current_order_id: null
        })
        .eq("id", currentDriver.id);

    // Notificar por Telegram
    await notifyTelegramDelivered(currentOrder);

    // Enviar WhatsApp al cliente
    sendWhatsAppToCustomer(currentOrder, "entregado");

    currentDriver.status = "disponible";
    currentDriver.current_order_id = null;
    localStorage.setItem("sipoteDriver", JSON.stringify(currentDriver));

    showToast("Pedido entregado! Buen trabajo!", "success");
    currentOrder = null;
    updateStatusUI();
    loadCurrentOrder();
    loadHistory();
    switchTab("disponibles");
}

// ============ HISTORIAL ============
async function loadHistory() {
    const container = document.getElementById("history-orders");

    // Pedidos entregados hoy por este domiciliario
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("domiciliario_id", currentDriver.id)
        .eq("status", "entregado");

    // Filtrar solo los de hoy (aproximado sin comparacion de fecha en servidor)
    const todayOrders = (orders || []).filter(o => {
        const orderDate = new Date(o.updated_at || o.created_at);
        return orderDate >= today;
    });

    // Estadisticas
    const totalEntregas = todayOrders.length;
    const totalMonto = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById("stat-entregas").textContent = totalEntregas;
    document.getElementById("stat-total").textContent = "$" + totalMonto.toLocaleString("es-CO");

    if (todayOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📋</span>
                <p>Sin entregas hoy</p>
            </div>
        `;
        return;
    }

    container.innerHTML = todayOrders.map(order => `
        <div class="order-card delivered">
            <div class="order-header">
                <span class="order-id">Pedido #${order.id}</span>
                <span class="order-total">$${Number(order.total || 0).toLocaleString("es-CO")}</span>
            </div>
            <div class="order-address">
                <span class="icon">📍</span>
                <span class="text">${order.delivery_address || "Sin direccion"}</span>
            </div>
            <div class="order-time">✅ Entregado ${formatTime(order.updated_at || order.created_at)}</div>
        </div>
    `).join("");
}

// ============ WHATSAPP ============
function sendWhatsAppToCustomer(order, type) {
    if (!order.customer_phone) {
        showToast("Cliente sin numero de telefono", "warning");
        return;
    }

    // Limpiar numero de telefono
    let phone = order.customer_phone.replace(/\D/g, "");

    // Agregar codigo de pais si no lo tiene
    if (phone.length === 10) {
        phone = "57" + phone; // Colombia
    }

    let message = "";

    if (type === "tomado") {
        message = `🛵 *SIPOTE MALTEADA*

Hola! Tu pedido #${order.id} ya fue asignado.

👤 Domiciliario: *${currentDriver.name}*
📞 Mi telefono: ${currentDriver.phone}

Voy en camino a recoger tu pedido. Te avisare cuando este cerca.

📍 Direccion de entrega:
${order.delivery_address}

💰 Total: $${Number(order.total || 0).toLocaleString("es-CO")}`;
    } else if (type === "llegando") {
        message = `🛵 *SIPOTE MALTEADA*

Hola! Soy ${currentDriver.name}, tu domiciliario.

📍 *Estoy llegando* a tu direccion:
${order.delivery_address}

Por favor estate pendiente. Gracias!`;
    } else if (type === "entregado") {
        message = `✅ *SIPOTE MALTEADA*

Tu pedido #${order.id} ha sido *entregado*.

Gracias por tu compra! Esperamos verte pronto.

⭐ Si te gusto nuestro servicio, recomiendanos!`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
}

// ============ TELEGRAM NOTIFICATIONS ============
async function notifyTelegramOrderTaken(order) {
    if (!TELEGRAM_CHAT_ID) return;

    const message = `🛵 <b>PEDIDO TOMADO</b>

📦 Pedido #${order.id}
👤 Domiciliario: <b>${currentDriver.name}</b>
📞 Tel: ${currentDriver.phone}

📍 ${order.delivery_address || "Sin direccion"}
📞 Cliente: ${order.customer_phone || "Sin telefono"}
💰 $${Number(order.total || 0).toLocaleString("es-CO")}

⏰ ${new Date().toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"})}`;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "HTML"
            })
        });
    } catch (err) {
        console.error("Error notifying Telegram:", err);
    }
}

async function notifyTelegramDelivered(order) {
    if (!TELEGRAM_CHAT_ID) return;

    const message = `✅ <b>PEDIDO ENTREGADO</b>

📦 Pedido #${order.id}
🛵 ${currentDriver.name}
📍 ${order.delivery_address || "Sin direccion"}
💰 $${Number(order.total || 0).toLocaleString("es-CO")}

⏰ ${new Date().toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"})}`;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "HTML"
            })
        });
    } catch (err) {
        console.error("Error notifying Telegram:", err);
    }
}

// ============ LOCATION TRACKING ============
function toggleLocation() {
    const bar = document.getElementById("location-bar");
    const btn = document.getElementById("btn-location");
    const text = document.getElementById("location-text");

    if (locationWatchId) {
        stopLocationTracking();
        bar.classList.remove("active");
        btn.textContent = "Activar";
        text.textContent = "Ubicacion desactivada";
    } else {
        startLocationTracking();
    }
}

function startLocationTracking() {
    if (!navigator.geolocation) {
        showToast("Tu navegador no soporta geolocalizacion", "error");
        return;
    }

    const bar = document.getElementById("location-bar");
    const btn = document.getElementById("btn-location");
    const text = document.getElementById("location-text");

    text.textContent = "Obteniendo ubicacion...";

    locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;

            bar.classList.add("active");
            btn.textContent = "Desactivar";
            text.textContent = `Ubicacion activa`;

            // Actualizar ubicacion en base de datos
            updateDriverLocation(latitude, longitude);
        },
        (error) => {
            console.error("Geolocation error:", error);
            text.textContent = "Error de ubicacion";
            showToast("No se pudo obtener la ubicacion", "error");
        },
        {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 10000
        }
    );
}

function stopLocationTracking() {
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
}

async function updateDriverLocation(lat, lng) {
    try {
        await supabase
            .from("delivery_drivers")
            .update({
                latitude: lat,
                longitude: lng,
                last_location_update: new Date().toISOString()
            })
            .eq("id", currentDriver.id);
    } catch (err) {
        console.error("Error updating location:", err);
    }
}

// ============ INCIDENTES ============
function showIncidentForm() {
    document.getElementById("modal-incidente").classList.add("active");
    document.getElementById("incident-form").reset();
    document.getElementById("incident-preview").innerHTML = `
        <span>📷</span>
        <p>Toca para tomar foto</p>
    `;
    document.getElementById("incident-preview").classList.remove("has-image");
}

function previewIncidentPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById("incident-preview");
        preview.innerHTML = `<img src="${e.target.result}" alt="Foto">`;
        preview.classList.add("has-image");
    };
    reader.readAsDataURL(file);
}

async function submitIncident(e) {
    e.preventDefault();

    const type = document.getElementById("incident-type").value;
    const description = document.getElementById("incident-description").value;
    const photoFile = document.getElementById("incident-photo").files[0];

    showToast("Enviando reporte...", "info");

    let imageUrl = null;

    // Subir foto si existe
    if (photoFile) {
        try {
            const formData = new FormData();
            formData.append("image", photoFile);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                imageUrl = data.data.url;
            }
        } catch (err) {
            console.error("Error uploading image:", err);
        }
    }

    // Guardar incidente en base de datos
    const incident = {
        driver_id: currentDriver.id,
        driver_name: currentDriver.name,
        order_id: currentOrder ? currentOrder.id : null,
        type: type,
        description: description,
        image_url: imageUrl,
        latitude: null,
        longitude: null,
        created_at: new Date().toISOString()
    };

    // Obtener ubicacion actual si esta disponible
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            incident.latitude = position.coords.latitude;
            incident.longitude = position.coords.longitude;
        } catch (err) {
            console.log("No se pudo obtener ubicacion para incidente");
        }
    }

    const { error } = await supabase.from("incidents").insert([incident]);

    if (error) {
        showToast("Error al enviar reporte: " + error.message, "error");
        return;
    }

    // Notificar por Telegram
    await notifyTelegramIncident(incident);

    closeModal("modal-incidente");
    showToast("Reporte enviado. El administrador sera notificado.", "success");
}

async function notifyTelegramIncident(incident) {
    if (!TELEGRAM_CHAT_ID) return;

    const typeLabels = {
        accidente: "🚨 ACCIDENTE",
        robo: "🚔 ROBO/ATRACO",
        vehiculo: "🔧 PROBLEMA VEHICULO",
        cliente: "😤 PROBLEMA CLIENTE",
        direccion: "📍 DIRECCION NO ENCONTRADA",
        otro: "⚠️ OTRO INCIDENTE"
    };

    let message = `${typeLabels[incident.type] || "⚠️ INCIDENTE"}

👤 Domiciliario: <b>${incident.driver_name}</b>
${incident.order_id ? `📦 Pedido #${incident.order_id}` : ""}

📝 <b>Descripcion:</b>
${incident.description}

${incident.latitude ? `📍 <a href="https://maps.google.com/?q=${incident.latitude},${incident.longitude}">Ver ubicacion</a>` : ""}

⏰ ${new Date().toLocaleTimeString("es-CO", {hour: "2-digit", minute: "2-digit"})}`;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "HTML",
                disable_web_page_preview: false
            })
        });

        // Si hay imagen, enviarla tambien
        if (incident.image_url) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    photo: incident.image_url,
                    caption: `📷 Foto del incidente - ${incident.driver_name}`
                })
            });
        }
    } catch (err) {
        console.error("Error notifying Telegram:", err);
    }
}

// ============ MODALS ============
function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

// Cerrar modal al hacer clic fuera
document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) {
            modal.classList.remove("active");
        }
    });
});

// ============ INIT ============
document.addEventListener("DOMContentLoaded", () => {
    // Verificar sesion guardada
    const savedDriver = localStorage.getItem("sipoteDriver");

    if (savedDriver) {
        currentDriver = JSON.parse(savedDriver);

        // Verificar que sigue activo
        supabase.from("delivery_drivers")
            .select("*")
            .eq("id", currentDriver.id)
            .then(({ data }) => {
                if (data && data.length > 0 && data[0].active) {
                    currentDriver = data[0];
                    localStorage.setItem("sipoteDriver", JSON.stringify(currentDriver));
                    showApp();
                } else {
                    localStorage.removeItem("sipoteDriver");
                    showToast("Tu cuenta ha sido desactivada", "warning");
                }
            });
    }
});
