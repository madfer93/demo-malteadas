// Kitchen Panel - Sipote Malteada
// Sistema de visualizacion de pedidos en tiempo real

let currentOrders = [];
let lastOrderCount = 0;

// Actualizar hora
function updateTime() {
    const now = new Date();
    document.getElementById("current-time").textContent = now.toLocaleTimeString("es-CO");
}
setInterval(updateTime, 1000);
updateTime();

// Cargar pedidos desde Supabase
async function loadOrders() {
    const { data: orders, error } = await supabase.from("orders").select("*");

    if (error) {
        console.error("Error cargando pedidos:", error);
        return;
    }

    if (!orders) return;

    // Filtrar pedidos de hoy
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(today));

    // Detectar nuevos pedidos para sonido
    const pendingOrders = todayOrders.filter(o => o.status === "nuevo" || o.status === "pendiente");
    if (pendingOrders.length > lastOrderCount && lastOrderCount > 0) {
        playNotification();
    }
    lastOrderCount = pendingOrders.length;

    currentOrders = todayOrders;
    renderOrders();
    updateStats();
}

// Reproducir sonido de notificacion
function playNotification() {
    const audio = document.getElementById("notification-sound");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio blocked:", e));
    }
}

// Renderizar pedidos en columnas
function renderOrders() {
    const pendingContainer = document.getElementById("pending-orders");
    const preparingContainer = document.getElementById("preparing-orders");
    const readyContainer = document.getElementById("ready-orders");

    const pending = currentOrders.filter(o => o.status === "nuevo" || o.status === "pendiente");
    const preparing = currentOrders.filter(o => o.status === "preparando");
    const ready = currentOrders.filter(o => o.status === "listo");

    pendingContainer.innerHTML = pending.length ? pending.map(o => renderOrderCard(o, "pending")).join("") : "<p class='no-orders'>Sin pedidos nuevos</p>";
    preparingContainer.innerHTML = preparing.length ? preparing.map(o => renderOrderCard(o, "preparing")).join("") : "<p class='no-orders'>Nada preparando</p>";
    readyContainer.innerHTML = ready.length ? ready.map(o => renderOrderCard(o, "ready")).join("") : "<p class='no-orders'>Sin pedidos listos</p>";
}

// Renderizar tarjeta de pedido
function renderOrderCard(order, type) {
    const time = order.created_at ? new Date(order.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "";
    const elapsed = getElapsedTime(order.created_at);

    let items = "";
    try {
        const parsed = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
        if (Array.isArray(parsed)) {
            items = parsed.map(i => "<li>" + (i.quantity || 1) + "x " + (i.name || i.producto || "Item") + "</li>").join("");
        }
    } catch (e) {
        items = "<li>Ver detalles en admin</li>";
    }

    let buttons = "";
    if (type === "pending") {
        buttons = "<button class='btn-start' onclick='updateStatus(" + order.id + ", \"preparando\")'>Iniciar</button>";
    } else if (type === "preparing") {
        buttons = "<button class='btn-ready' onclick='updateStatus(" + order.id + ", \"listo\")'>Listo</button>";
    } else {
        buttons = "<button class='btn-delivered' onclick='updateStatus(" + order.id + ", \"entregado\")'>Entregado</button>";
    }

    return "<div class='order-card " + type + "'>" +
        "<div class='order-header'>" +
            "<span class='order-number'>#" + order.id + "</span>" +
            "<span class='order-time'>" + time + "</span>" +
        "</div>" +
        (order.table_number ? "<div class='order-table'>Mesa " + order.table_number + "</div>" : "") +
        (order.customer_name ? "<div class='order-customer'>" + order.customer_name + "</div>" : "") +
        "<ul class='order-items'>" + items + "</ul>" +
        (order.notes ? "<div class='order-notes'>" + order.notes + "</div>" : "") +
        "<div class='order-elapsed'>" + elapsed + "</div>" +
        "<div class='order-actions'>" + buttons + "</div>" +
    "</div>";
}

// Calcular tiempo transcurrido
function getElapsedTime(createdAt) {
    if (!createdAt) return "";
    const created = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now - created) / 1000 / 60);

    if (diff < 1) return "Ahora";
    if (diff < 60) return diff + " min";
    return Math.floor(diff / 60) + "h " + (diff % 60) + "m";
}

// Actualizar estado del pedido
async function updateStatus(id, newStatus) {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);

    if (error) {
        console.error("Error actualizando estado:", error);
        alert("Error al actualizar");
        return;
    }

    loadOrders();
}

// Actualizar estadisticas
function updateStats() {
    const pending = currentOrders.filter(o => o.status === "nuevo" || o.status === "pendiente").length;
    const preparing = currentOrders.filter(o => o.status === "preparando").length;

    document.getElementById("pending-count").textContent = pending + " pendientes";
    document.getElementById("preparing-count").textContent = preparing + " preparando";
}

// Polling para actualizaciones (cada 5 segundos)
function startPolling() {
    loadOrders();
    setInterval(loadOrders, 5000);
}

// Iniciar al cargar
document.addEventListener("DOMContentLoaded", startPolling);
