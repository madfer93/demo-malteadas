// POS Independiente - Sipote Malteada
let allProducts = [];
let posCart = [];
let currentCategory = "all";
let paymentMethod = "efectivo";

// Reloj
function updateClock() {
    const now = new Date();
    document.getElementById("current-time").textContent = now.toLocaleTimeString("es-CO");
}
setInterval(updateClock, 1000);
updateClock();

// Cargar productos
async function loadProducts() {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
        console.error("Error:", error);
        return;
    }
    allProducts = data.filter(p => p.available);
    renderProducts();
}

// Renderizar productos
function renderProducts() {
    const grid = document.getElementById("products-grid");
    let filtered = currentCategory === "all" ? allProducts : allProducts.filter(p => p.category === currentCategory);
    
    grid.innerHTML = filtered.map(p => 
        "<div class='product-item' onclick='addToCart(" + p.id + ")'>" +
            "<img src='" + (p.image_url || "https://via.placeholder.com/100") + "' onerror=\"this.src='https://via.placeholder.com/100'\">" +
            "<h4>" + p.name + "</h4>" +
            "<p class='product-price'>$" + Number(p.price).toLocaleString("es-CO") + "</p>" +
        "</div>"
    ).join("");
}

// Filtros de categoria
document.querySelectorAll(".pos-cat").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".pos-cat").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.cat;
        renderProducts();
    });
});

// Metodo de pago
document.querySelectorAll(".pay-method").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".pay-method").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        paymentMethod = btn.dataset.method;
    });
});

// Agregar al carrito
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existing = posCart.find(i => i.id === productId);
    if (existing) {
        existing.quantity++;
    } else {
        posCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    updateCart();
}

// Actualizar carrito
function updateCart() {
    const container = document.getElementById("cart-items");
    
    if (posCart.length === 0) {
        container.innerHTML = "<p class='empty-cart'>Sin productos</p>";
        document.getElementById("subtotal").textContent = "$0";
        document.getElementById("total").textContent = "$0";
        return;
    }
    
    container.innerHTML = posCart.map((item, idx) => 
        "<div class='cart-item'>" +
            "<div class='item-info'>" +
                "<span class='item-name'>" + item.name + "</span>" +
                "<span class='item-price'>$" + Number(item.price).toLocaleString("es-CO") + "</span>" +
            "</div>" +
            "<div class='item-controls'>" +
                "<button onclick='decreaseQty(" + idx + ")'>-</button>" +
                "<span>" + item.quantity + "</span>" +
                "<button onclick='increaseQty(" + idx + ")'>+</button>" +
            "</div>" +
            "<span class='item-subtotal'>$" + (item.price * item.quantity).toLocaleString("es-CO") + "</span>" +
            "<button class='remove-btn' onclick='removeItem(" + idx + ")'>X</button>" +
        "</div>"
    ).join("");
    
    const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById("subtotal").textContent = "$" + total.toLocaleString("es-CO");
    document.getElementById("total").textContent = "$" + total.toLocaleString("es-CO");
}

function increaseQty(idx) {
    posCart[idx].quantity++;
    updateCart();
}

function decreaseQty(idx) {
    if (posCart[idx].quantity > 1) {
        posCart[idx].quantity--;
    } else {
        posCart.splice(idx, 1);
    }
    updateCart();
}

function removeItem(idx) {
    posCart.splice(idx, 1);
    updateCart();
}

function clearCart() {
    posCart = [];
    document.getElementById("mesa-number").value = "";
    updateCart();
}

// Procesar pago
async function processPayment() {
    if (posCart.length === 0) {
        alert("Carrito vacio");
        return;
    }
    
    const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const mesa = document.getElementById("mesa-number").value || null;
    
    // Guardar en pos_sales
    const { error } = await supabase.from("pos_sales").insert([{
        items: JSON.stringify(posCart),
        total: total,
        table_number: mesa,
        payment_method: paymentMethod
    }]);
    
    if (error) {
        console.error("Error:", error);
        alert("Error al procesar venta");
        return;
    }
    
    // Mostrar confirmacion
    document.getElementById("payment-total").textContent = "$" + total.toLocaleString("es-CO");
    document.getElementById("payment-method-display").textContent = "Metodo: " + paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
    document.getElementById("payment-modal").classList.add("active");
    
    // Limpiar
    clearCart();
}

function closeModal() {
    document.getElementById("payment-modal").classList.remove("active");
}

// Click fuera del modal cierra
document.getElementById("payment-modal").addEventListener("click", e => {
    if (e.target.id === "payment-modal") closeModal();
});

// Iniciar
document.addEventListener("DOMContentLoaded", loadProducts);
