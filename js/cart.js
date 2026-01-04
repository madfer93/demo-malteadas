// Carrito compartido - Sipote Malteada
let cart = JSON.parse(localStorage.getItem('sipoteCart')) || [];
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
    const miniCart = document.getElementById('mini-cart');
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

function checkout() {
    if (cart.length === 0) {
        alert('El carrito esta vacio');
        return;
    }

    let message = '*Pedido Sipote Malteada*\n\n';

    // Agregar numero de mesa si existe
    if (mesaActual) {
        message += `*MESA: ${mesaActual}*\n\n`;
    }

    let sum = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        sum += subtotal;
        message += `- ${item.name} x${item.quantity} - $${subtotal.toLocaleString('es-CO')}\n`;
    });

    message += `\n*Total: $${sum.toLocaleString('es-CO')}*`;
    message += '\n\n_Enviado desde sipote-malteada.github.io_';

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP}?text=${encoded}`, '_blank');
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
