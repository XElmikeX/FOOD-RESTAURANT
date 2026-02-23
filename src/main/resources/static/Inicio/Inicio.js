document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', function(e) {
                const loader = document.getElementById('loader');
                loader.style.display = 'flex';
                
                // Simula tiempo de carga
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 1500);
            });
        });
        
        // Efecto de hover con sonido (opcional)
        const cards = document.querySelectorAll('.role-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
        
        // Animación de entrada
        window.addEventListener('load', () => {
            document.querySelectorAll('.role-card').forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 200);
            });
});