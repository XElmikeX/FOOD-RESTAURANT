// envioComplet.js

document.addEventListener('DOMContentLoaded', function() {
    // Manejar envío del formulario con AJAX
    document.querySelectorAll('.form-completar').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const form = this;
            const button = form.querySelector('.btn-confirmacion');
            const originalText = button.innerHTML;
            const card = form.closest('.pedido-card');
            const pedidoId = card.dataset.pedidoId;
            const mesaId = obtenerMesaId();
            
            // Mostrar estado de carga
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Procesando...</span>';
            
            // Enviar la petición AJAX
            fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
            .then(response => {
                if (response.ok) {
                    // Éxito - Marcar como completado en localStorage
                    if (mesaId && pedidoId) {
                        marcarPedidoCompletado(mesaId, pedidoId);
                    }
                    
                    // Animación de éxito
                    card.style.opacity = '0.5';
                    card.style.pointerEvents = 'none';
                    
                    button.innerHTML = '<i class="fas fa-check"></i><span>¡Completado!</span>';
                    button.classList.add('completado');
                    
                    // Mostrar notificación de éxito
                    mostrarNotificacion('✅ Pedido enviado a facturación', 'success');
                    
                    // Eliminar la tarjeta después de un tiempo
                    setTimeout(() => {
                        card.remove();
                        
                        // Verificar si no hay más tarjetas
                        const cardsRestantes = document.querySelectorAll('.pedido-card:not([style*="display: none"])');
                        if (cardsRestantes.length === 0) {
                            setTimeout(() => {
                                window.location.href = '/Rol/Cocinero';
                            }, 1500);
                        }
                    }, 1500);
                } else {
                    throw new Error('Error en la respuesta');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                button.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Error, reintentar</span>';
                button.disabled = false;
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 3000);
            });
        });
    });
});

function obtenerMesaId() {
    const mesaElement = document.querySelector('.mesa-numero:last-child');
    if (mesaElement) {
        return mesaElement.textContent.replace('Mesa: ', '').trim();
    }
    return null;
}

function marcarPedidoCompletado(mesaId, pedidoId) {
    const STORAGE_KEY = 'estados_mesas_cocina';
    let estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    if (estadosGuardados[mesaId]) {
        // Filtrar pedidos para eliminar el completado
        estadosGuardados[mesaId].pedidos = estadosGuardados[mesaId].pedidos.filter(
            p => p.pedidoId !== pedidoId
        );
        
        // Verificar si quedan pedidos en proceso o listo
        const tieneActivos = estadosGuardados[mesaId].pedidos.some(
            p => p.estado === 'proceso' || p.estado === 'listo'
        );
        
        if (estadosGuardados[mesaId].pedidos.length === 0 || !tieneActivos) {
            // Si no quedan pedidos activos, eliminar la mesa
            delete estadosGuardados[mesaId];
            console.log('Mesa eliminada por no tener pedidos activos');
        } else {
            // Actualizar timestamp
            estadosGuardados[mesaId].timestamp = new Date().toISOString();
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
        console.log('Pedido marcado como completado:', { mesaId, pedidoId });
        
        // Disparar evento para actualizar Mozo
        window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify(estadosGuardados)
        }));
    }
}

function mostrarNotificacion(mensaje, tipo) {
    // Eliminar notificaciones anteriores
    const notificacionesPrevias = document.querySelectorAll('.notificacion-temp');
    notificacionesPrevias.forEach(n => n.remove());
    
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion-temp ${tipo}`;
    notificacion.innerHTML = mensaje;
    
    // Estilos para la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        ${tipo === 'success' ? 'background: linear-gradient(135deg, #27ae60, #2ecc71);' : ''}
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}