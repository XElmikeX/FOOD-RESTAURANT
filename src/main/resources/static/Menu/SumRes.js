// Incrementar cantidad
document.querySelectorAll('.btnSubir').forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.closest('.cantidad').querySelector('.cantidadInput');
        let valor = parseInt(input.value);
        if (valor < 99) {
            input.value = valor + 1;
        }
    });
});

// Decrementar cantidad
document.querySelectorAll('.btnBajar').forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.closest('.cantidad').querySelector('.cantidadInput');
        let valor = parseInt(input.value);
        if (valor > 0) {
            input.value = valor - 1;
        }
    });
});