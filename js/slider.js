let slideIndex = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

function showSlide(n) {
    slideIndex = n;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === n));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === n));
}

dots.forEach((dot, i) => {
    dot.addEventListener('click', () => showSlide(i));
});

// Auto advance cada 8 segundos
setInterval(() => {
    slideIndex = (slideIndex + 1) % slides.length;
    showSlide(slideIndex);
}, 8000);

// Iniciar
showSlide(0);
