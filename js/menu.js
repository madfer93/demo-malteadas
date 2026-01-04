// Menu - Sipote Malteada
let allProducts = [];
let currentCategory = 'all';

async function loadProducts() {
    const grid = document.getElementById('products-grid');
    const { data, error } = await supabase.from('products').select('*');
    if (error || !data) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Error cargando productos</p>';
        console.error('Error:', error);
        return;
    }
    allProducts = data.filter(p => p.available);
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    let filtered = currentCategory === 'all' ? allProducts : allProducts.filter(p => p.category === currentCategory);
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No hay productos</p>';
        return;
    }
    grid.innerHTML = filtered.map(p => {
        const safeName = p.name.replace(/'/g, "\'");
        return `
            <div class="product-card" data-category="${p.category}">
                <img src="${p.image_url || 'https://via.placeholder.com/350x350?text=Sipote'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/350x350?text=Sipote'">
                <h3>${p.name}</h3>
                <p class="description">${p.description || ''}</p>
                <p class="price">$${Number(p.price).toLocaleString('es-CO')}</p>
                <button class="add-btn" onclick="addToCart('${safeName}', ${p.price}, 1)">Agregar al Carrito</button>
            </div>
        `;
    }).join('');
}

function setupCategoryFilters() {
    const buttons = document.querySelectorAll('.cat-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderProducts();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupCategoryFilters();
});
