// envioComplet.js - VERSIÓN COMPLETA Y FUNCIONAL
console.log('🚀 envioComplet.js CARGADO - Versión completa');

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado');
    asignarEventosBotones();
    
    // Escuchar cambios de localStorage (sincronización entre dispositivos)
    window.addEventListener('storage', function(e) {
        if (e.key === 'pedido_completado') {
            try {
                const data = JSON.parse(e.newValue);
                console.log('📡 Pedido completado detectado en otra pestaña:', data);
                
                const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${data.pedidoId}"]`);
                if (pedidoCard) {
                    eliminarTarjetaConAnimacion(pedidoCard, data.mesaId);
                }
            } catch (error) {
                console.error('Error procesando evento:', error);
            }
        }
    });
});

// Asignar eventos a todos los botones
function asignarEventosBotones() {
    document.querySelectorAll('.btn-confirmacion').forEach((boton) => {
        boton.removeEventListener('click', manejarClickCompletar);
        boton.addEventListener('click', manejarClickCompletar);
        console.log('Evento asignado a botón con ID:', boton.getAttribute('data-pedido-id'));
    });
}

// Manejador principal del click
function manejarClickCompletar(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 Click en botón de completar');
    
    const boton = event.currentTarget;
    const pedidoId = boton.getAttribute('data-pedido-id');
    const card = boton.closest('.pedido-card');
    
    console.log('ID del pedido:', pedidoId);
    
    if (!pedidoId) {
        console.error('❌ No hay ID de pedido');
        alert('Error: No se encontró el ID del pedido');
        return;
    }
    
    if (!card) {
        console.error('❌ No se encontró la tarjeta del pedido');
        return;
    }
    
    // Guardar texto original para restaurar en caso de error
    const textoOriginal = boton.innerHTML;
    
    // Cambiar botón a estado de carga
    boton.disabled = true;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completando...';
    
    // Hacer la petición al servidor
    fetch(`/completarPedido/${pedidoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Pedido completado con éxito');
            
            // Guardar en sessionStorage que este pedido fue completado
            const completados = JSON.parse(sessionStorage.getItem('completados') || '[]');
            completados.push({
                pedidoId: pedidoId,
                mesaId: data.mesaId,
                timestamp: Date.now()
            });
            sessionStorage.setItem('completados', JSON.stringify(completados));
            
            // También guardar en localStorage para otras pestañas
            localStorage.setItem('ultimo_completado', JSON.stringify({
                pedidoId: pedidoId,
                mesaId: data.mesaId,
                timestamp: Date.now()
            }));
            
            // Notificar a otras pestañas/dispositivos
            notificarPedidoCompletado(pedidoId, data.mesaId);
            
            // Eliminar la tarjeta con animación
            eliminarTarjetaConAnimacion(card, data.mesaId);
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        alert('Error al completar el pedido: ' + error.message);
        
        // Restaurar botón
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
    });
}

function notificarPedidoCompletado(pedidoId, mesaId) {
    console.log('📢 PREPARANDO NOTIFICACIÓN PARA OTROS DISPOSITIVOS');
    console.log('   Pedido ID:', pedidoId);
    console.log('   Mesa ID:', mesaId);
    console.log('   URL actual:', window.location.href);
    
    const evento = {
        pedidoId: pedidoId,
        mesaId: mesaId,
        timestamp: Date.now(),
        action: 'completado',
        url: window.location.href,
        forced: true
    };
    
    // Limpiar cualquier notificación anterior
    localStorage.removeItem('pedido_completado');
    sessionStorage.removeItem('pedido_completado_urgente');
    
    // Enviar nueva notificación
    localStorage.setItem('pedido_completado', JSON.stringify(evento));
    sessionStorage.setItem('pedido_completado_urgente', JSON.stringify(evento));
    
    console.log('✅ NOTIFICACIÓN ENVIADA:', evento);
    console.log('   localStorage.getItem():', localStorage.getItem('pedido_completado'));
    
    // Verificar que se guardó correctamente
    setTimeout(() => {
        const verificar = localStorage.getItem('pedido_completado');
        console.log('🔍 Verificación - localStorage contiene:', verificar);
    }, 100);
    
    // Limpiar después de 5 segundos
    setTimeout(() => {
        localStorage.removeItem('pedido_completado');
        sessionStorage.removeItem('pedido_completado_urgente');
        console.log('🧹 Notificación limpiada');
    }, 5000);
}

// Eliminar tarjeta con animación y DESHABILITAR INTERACCIÓN
function eliminarTarjetaConAnimacion(card, mesaId) {
    if (!card) return;
    
    // IMPORTANTE: Deshabilitar TODOS los botones dentro de la tarjeta INMEDIATAMENTE
    const botones = card.querySelectorAll('button');
    botones.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // También deshabilitar clicks en toda la tarjeta
    card.style.pointerEvents = 'none';
    
    // Animar la desaparición
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        if (card.parentNode) {
            card.remove();
            
            // Verificar si quedan pedidos
            const todosLosPedidos = document.querySelectorAll('.pedido-card');
            console.log(`📋 Total pedidos restantes: ${todosLosPedidos.length}`);
            
            if (todosLosPedidos.length === 0) {
                mostrarMensajeSinPedidos();
            }
        }
    }, 300);
}

// Mostrar mensaje cuando no hay pedidos
function mostrarMensajeSinPedidos() {
    // Buscar o crear contenedor para el mensaje
    let fullWidthContainer = document.querySelector('.fullwidth-message-container');
    if (!fullWidthContainer) {
        fullWidthContainer = document.createElement('div');
        fullWidthContainer.className = 'fullwidth-message-container';
        
        const containerElement = document.querySelector('.container');
        const header = document.querySelector('header');
        
        if (header && header.nextSibling) {
            containerElement.insertBefore(fullWidthContainer, header.nextSibling);
        } else {
            containerElement.appendChild(fullWidthContainer);
        }
    }
    
    fullWidthContainer.innerHTML = `
        <div class="sin-pedidos-fullwidth">
            <i class="fas fa-check-circle"></i>
            <h3>¡No hay pedidos pendientes!</h3>
            <p>Esta mesa no tiene pedidos en espera. Todos han sido procesados.</p>
            <a href="/Rol/Cocinero" class="back-btn" style="margin-top: 20px;">
                <i class="fas fa-arrow-left"></i> Volver a todas las mesas
            </a>
        </div>
    `;
    
    // Ocultar el contenedor de pedidos
    const cardsContainer = document.querySelector('.cards-pedidos-container');
    if (cardsContainer) {
        cardsContainer.style.display = 'none';
    }
}