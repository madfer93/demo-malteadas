// Carrito y Checkout Online - Sipote Malteada
let cart = JSON.parse(localStorage.getItem('sipoteCart')) || [];
let selectedOrderType = null;
const WHATSAPP = '573045788873';

// Capturar numero de mesa desde URL (QR)
function getMesaFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mesa');
}

const mesaActual = getMesaFromURL();

// Toast notification para carrito
function showCartToast(message) {
    let container = document.getElementById('cart-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cart-toast-container';
        container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: linear-gradient(135deg, #6bcb77, #4ade80);
        color: white;
        padding: 15px 30px;
        border-radius: 50px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.2);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 1em;
        font-weight: 500;
        animation: toastPop 0.4s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    toast.innerHTML = '<span style="font-size:1.3em">&#10003;</span> ' + message;

    if (!document.getElementById('cart-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'cart-toast-styles';
        style.textContent = '@keyframes toastPop { 0% { transform: scale(0.5) translateY(-20px); opacity: 0; } 50% { transform: scale(1.1) translateY(0); } 100% { transform: scale(1) translateY(0); opacity: 1; } } @keyframes toastOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }';
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function addToCart(name, price, quantity = 1) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ name, price, quantity });
    }
    localStorage.setItem('sipoteCart', JSON.stringify(cart));
    updateMiniCart();
    showCart();
    showCartToast(name + ' agregado');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('sipoteCart', JSON.stringify(cart));
    updateMiniCart();
}

function clearCart() {
    cart = [];
    localStorage.setItem('sipoteCart', JSON.stringify(cart));
    updateMiniCart();
    hideCart();
}

function updateMiniCart() {
    const items = document.getElementById('mini-cart-items');
    const total = document.getElementById('mini-cart-total');
    const count = document.getElementById('cart-count');

    if (!items || !total) return;

    let sum = 0;
    let qty = 0;

    items.innerHTML = cart.map((item, i) => {
        sum += item.price * item.quantity;
        qty += item.quantity;
        return `
            <div class="mini-cart-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                <button class="remove-item" onclick="removeFromCart(${i})">X</button>
            </div>
        `;
    }).join('');

    total.textContent = `Total: $${sum.toLocaleString('es-CO')}`;
    if (count) count.textContent = qty;

    // Mostrar/ocultar carrito segun contenido
    const toggle = document.getElementById('cart-toggle');
    if (toggle) toggle.style.display = qty > 0 ? 'flex' : 'none';
}

function showCart() {
    const miniCart = document.getElementById('mini-cart');
    if (miniCart) miniCart.style.display = 'block';
}

function hideCart() {
    const miniCart = document.getElementById('mini-cart');
    if (miniCart) miniCart.style.display = 'none';
}

function toggleCart() {
    const miniCart = document.getElementById('mini-cart');
    if (miniCart) {
        miniCart.style.display = miniCart.style.display === 'none' ? 'block' : 'none';
    }
}

// ============ CHECKOUT MODAL ============
function showCheckoutModal() {
    if (cart.length === 0) {
        alert('El carrito esta vacio');
        return;
    }

    // Si viene de QR (mesa), enviar directo sin preguntar
    if (mesaActual) {
        sendMesaOrder();
        return;
    }

    // Reset para pedidos sin QR
    selectedOrderType = null;
    document.querySelectorAll('.order-type-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.checkout-fields').forEach(f => f.style.display = 'none');
    document.getElementById('notas-group').style.display = 'none';
    document.getElementById('btn-confirmar').disabled = true;
    document.getElementById('btn-confirmar').textContent = 'Selecciona tipo de pedido';

    // Llenar resumen
    updateCheckoutSummary();

    // Mostrar modal
    document.getElementById('checkout-modal').style.display = 'flex';
    hideCart();
}

// Pedido directo desde QR de mesa
async function sendMesaOrder() {
    const btn = document.getElementById('checkout-mini');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemsText = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');

        const order = {
            table_number: parseInt(mesaActual),
            total: total,
            status: 'pendiente',
            order_type: 'mesa',
            notes: itemsText
        };

        const { data, error } = await supabase.from('orders').insert([order]).select();

        if (error) throw new Error(error.message);

        const orderId = data[0].id;

        // Notificar a Telegram
        await sendTelegramMesa(order, orderId, itemsText);

        // Mostrar confirmacion
        showMesaConfirmation(orderId, order);

        // Limpiar carrito
        clearCart();

    } catch (err) {
        console.error('Error:', err);
        alert('Error al enviar pedido: ' + err.message);
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function sendTelegramMesa(order, orderId, itemsText) {
    if (typeof TELEGRAM_BOT_TOKEN === 'undefined' || !TELEGRAM_CHAT_ID) return;

    let message = `🍽️ <b>PEDIDO MESA ${order.table_number}</b>\n`;
    message += `📋 Pedido #${orderId}\n`;
    message += `📱 <i>Via QR Menu Digital</i>\n\n`;
    message += `🛒 <b>Productos:</b>\n${itemsText}\n\n`;
    message += `💰 <b>Total:</b> $${order.total.toLocaleString('es-CO')}`;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error('Error Telegram:', err);
    }
}

function showMesaConfirmation(orderId, order) {
    document.getElementById('confirm-order-id').textContent = orderId;
    document.getElementById('confirm-message').textContent =
        `Tu pedido sera llevado a la Mesa ${order.table_number}. Gracias!`;
    document.getElementById('confirm-details').innerHTML = `
        <p><strong>Mesa:</strong> ${order.table_number}</p>
        <p><strong>Total:</strong> $${order.total.toLocaleString('es-CO')}</p>
        <p style="color:#25D366; margin-top:10px;"><strong>El pedido ya fue enviado a cocina</strong></p>
    `;
    document.getElementById('order-confirmation').style.display = 'flex';
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function selectOrderType(type) {
    selectedOrderType = type;

    // Actualizar botones
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.type === type);
    });

    // Mostrar campos correspondientes
    document.getElementById('mesa-fields').style.display = type === 'mesa' ? 'block' : 'none';
    document.getElementById('llevar-fields').style.display = type === 'llevar' ? 'block' : 'none';
    document.getElementById('domicilio-fields').style.display = type === 'domicilio' ? 'block' : 'none';
    document.getElementById('notas-group').style.display = 'block';

    // Actualizar campos required
    const nombreDom = document.getElementById('checkout-nombre');
    const telDom = document.getElementById('checkout-telefono');
    const dirDom = document.getElementById('checkout-direccion');

    if (type === 'domicilio') {
        nombreDom.required = true;
        telDom.required = true;
        dirDom.required = true;
    } else {
        nombreDom.required = false;
        telDom.required = false;
        dirDom.required = false;
    }

    // Habilitar boton
    const btn = document.getElementById('btn-confirmar');
    btn.disabled = false;

    if (type === 'mesa') {
        btn.textContent = 'Confirmar Pedido de Mesa';
    } else if (type === 'llevar') {
        btn.textContent = 'Confirmar Para Llevar';
    } else {
        btn.textContent = 'Pedir Domicilio';
    }
}

function updateCheckoutSummary() {
    const itemsContainer = document.getElementById('checkout-items');
    const totalDisplay = document.getElementById('checkout-total-display');

    let sum = 0;
    itemsContainer.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        sum += subtotal;
        return `<div class="item"><span>${item.name} x${item.quantity}</span><span>$${subtotal.toLocaleString('es-CO')}</span></div>`;
    }).join('');

    totalDisplay.textContent = `Total: $${sum.toLocaleString('es-CO')}`;
}

// ============ PROCESAR CHECKOUT ============
async function processCheckout(e) {
    e.preventDefault();

    if (!selectedOrderType) {
        alert('Selecciona un tipo de pedido');
        return;
    }

    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    try {
        // Calcular total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Preparar items como texto (ya que la tabla no tiene columna items JSONB)
        const itemsText = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');

        // Construir orden segun tipo
        const order = {
            total: total,
            status: 'pendiente',
            notes: document.getElementById('checkout-notas').value || itemsText
        };

        if (selectedOrderType === 'mesa') {
            order.table_number = parseInt(document.getElementById('checkout-mesa').value) || null;
            order.order_type = 'mesa';
        } else if (selectedOrderType === 'llevar') {
            order.customer_name = document.getElementById('checkout-nombre-llevar').value || 'Cliente';
            order.customer_phone = document.getElementById('checkout-tel-llevar').value || '';
            order.order_type = 'llevar';
        } else if (selectedOrderType === 'domicilio') {
            order.customer_name = document.getElementById('checkout-nombre').value;
            order.customer_phone = document.getElementById('checkout-telefono').value;
            order.delivery_address = document.getElementById('checkout-direccion').value;
            order.order_type = 'domicilio';
        }

        // Guardar en Supabase
        const { data, error } = await supabase.from('orders').insert([order]).select();

        if (error) {
            throw new Error(error.message);
        }

        const orderId = data[0].id;

        // Enviar notificacion a Telegram
        await sendTelegramNotification(order, orderId, itemsText);

        // Mostrar confirmacion
        showOrderConfirmation(orderId, order);

        // Limpiar carrito
        clearCart();
        closeCheckoutModal();

    } catch (err) {
        console.error('Error en checkout:', err);
        alert('Error al procesar el pedido: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Reintentar';
    }
}

// ============ NOTIFICACION TELEGRAM ============
async function sendTelegramNotification(order, orderId, itemsText) {
    if (typeof TELEGRAM_BOT_TOKEN === 'undefined' || typeof TELEGRAM_CHAT_ID === 'undefined') {
        console.log('Telegram no configurado');
        return;
    }

    if (!TELEGRAM_CHAT_ID) return;

    let emoji = '';
    let tipoTexto = '';

    if (order.order_type === 'mesa') {
        emoji = '🍽️';
        tipoTexto = `PEDIDO MESA #${order.table_number || '?'}`;
    } else if (order.order_type === 'llevar') {
        emoji = '🥡';
        tipoTexto = 'PEDIDO PARA LLEVAR';
    } else {
        emoji = '🛵';
        tipoTexto = 'NUEVO DOMICILIO';
    }

    let message = `${emoji} <b>${tipoTexto}</b>\n`;
    message += `📋 Pedido #${orderId}\n\n`;
    message += `🛒 <b>Productos:</b>\n${itemsText}\n\n`;
    message += `💰 <b>Total:</b> $${order.total.toLocaleString('es-CO')}\n`;

    if (order.customer_name) {
        message += `\n👤 <b>Cliente:</b> ${order.customer_name}`;
    }
    if (order.customer_phone) {
        message += `\n📱 <b>Tel:</b> ${order.customer_phone}`;
    }
    if (order.delivery_address) {
        message += `\n\n📍 <b>Direccion:</b>\n${order.delivery_address}`;

        // Link a Google Maps
        const mapsQuery = encodeURIComponent(order.delivery_address + ', Villavicencio');
        message += `\n\n🗺️ <a href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}">Ver en Google Maps</a>`;

        // Link a app domiciliarios
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        message += `\n\n📲 <a href="${baseUrl}/domiciliario.html">Abrir App Domiciliarios</a>`;
    }
    if (order.notes && order.notes !== itemsText) {
        message += `\n\n📝 <b>Notas:</b> ${order.notes}`;
    }

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
    } catch (err) {
        console.error('Error enviando a Telegram:', err);
    }
}

// ============ CONFIRMACION ============
function showOrderConfirmation(orderId, order) {
    document.getElementById('confirm-order-id').textContent = orderId;

    let message = '';
    let details = '';

    if (order.order_type === 'mesa') {
        message = `Tu pedido sera llevado a la mesa ${order.table_number || ''}`;
        details = `<p><strong>Mesa:</strong> ${order.table_number || 'Sin asignar'}</p>`;
    } else if (order.order_type === 'llevar') {
        message = 'Te avisaremos cuando este listo para recoger';
        if (order.customer_name) {
            details = `<p><strong>Nombre:</strong> ${order.customer_name}</p>`;
        }
    } else {
        message = 'Tu domicilio esta siendo preparado. Te notificaremos cuando vaya en camino.';
        details = `
            <p><strong>Nombre:</strong> ${order.customer_name}</p>
            <p><strong>Telefono:</strong> ${order.customer_phone}</p>
            <p><strong>Direccion:</strong> ${order.delivery_address}</p>
        `;
    }

    details += `<p><strong>Total:</strong> $${order.total.toLocaleString('es-CO')}</p>`;

    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-details').innerHTML = details;
    document.getElementById('order-confirmation').style.display = 'flex';
}

function closeConfirmation() {
    document.getElementById('order-confirmation').style.display = 'none';
}

// Mantener checkout viejo por WhatsApp como fallback
function checkout() {
    showCheckoutModal();
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    updateMiniCart();

    // Mostrar banner de mesa si viene de QR
    if (mesaActual) {
        const banner = document.getElementById('mesa-banner');
        const numero = document.getElementById('mesa-numero');
        if (banner && numero) {
            numero.textContent = mesaActual;
            banner.style.display = 'block';
        }
    }
});
