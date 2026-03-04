// envioComplet.js - VERSIÓN DE PRUEBA SIMPLIFICADA (SIN ALERT)
console.log('🚀 envioComplet.js CARGADO - Versión de prueba');

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, buscando botones...');
    
    // Buscar todos los botones de confirmación
    const botones = document.querySelectorAll('.btn-confirmacion');
    console.log(`📊 Se encontraron ${botones.length} botones de confirmación`);
    
    // Asignar evento a cada botón
    botones.forEach((boton, index) => {
        console.log(`Asignando evento al botón ${index + 1}`);
        
        // Remover eventos anteriores para evitar duplicados
        boton.removeEventListener('click', manejarClickCompletar);
        
        // Agregar nuevo evento
        boton.addEventListener('click', manejarClickCompletar);
    });
});

// Función para manejar el click
function manejarClickCompletar(event) {
    // Prevenir comportamiento por defecto
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 BOTÓN CLICKEADO - Evento disparado');
    
    const boton = event.currentTarget;
    const card = boton.closest('.pedido-card');
    
    if (!card) {
        console.error('❌ No se encontró la tarjeta del pedido');
        return;
    }
    
    const pedidoId = card.dataset.pedidoId;
    console.log('📦 ID del pedido:', pedidoId);
    
    if (!pedidoId) {
        console.error('❌ No se encontró el ID del pedido');
        return;
    }
    
    // Guardar texto original
    const textoOriginal = boton.innerHTML;
    
    // Cambiar botón a estado de carga
    boton.disabled = true;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    
    // Construir URL
    const url = `/completarPedido/${pedidoId}`;
    console.log('📡 Enviando petición a:', url);
    
    // Hacer fetch
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => {
        console.log('📥 Respuesta recibida, status:', response.status);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('📊 Datos recibidos:', data);
        
        if (data.success) {
            console.log('✅ Pedido completado con éxito');
            
            // Animación de eliminación
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            
            // Eliminar la tarjeta después de la animación
            setTimeout(() => {
                if (card.parentNode) {
                    card.remove();
                    
                    // Verificar si quedan pedidos
                    const pedidosRestantes = document.querySelectorAll('.pedido-card');
                    console.log(`📋 Pedidos restantes: ${pedidosRestantes.length}`);
                    
                    if (pedidosRestantes.length === 0) {
                        // Ocultar el contenedor de pedidos
                        const container = document.querySelector('.cards-pedidos-container');
                        if (container) {
                            container.style.display = 'none';
                        }
                        
                        // Buscar o crear contenedor para el mensaje centrado
                        let fullWidthContainer = document.querySelector('.fullwidth-message-container');
                        if (!fullWidthContainer) {
                            fullWidthContainer = document.createElement('div');
                            fullWidthContainer.className = 'fullwidth-message-container';
                            
                            // Insertar después del header o al final del container
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
                            </div>
                        `;
                    }
                }
            }, 300);
            
        } else {
            throw new Error(data.message || 'Error desconocido');
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        
        // Restaurar botón
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
    });
}

// También asignar eventos si hay cambios en el DOM (por si acaso)
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            console.log('🔄 Detectados cambios en el DOM, reasignando eventos...');
            document.querySelectorAll('.btn-confirmacion').forEach(boton => {
                boton.removeEventListener('click', manejarClickCompletar);
                boton.addEventListener('click', manejarClickCompletar);
            });
        }
    });
});

// Observar cambios en el cuerpo del documento
observer.observe(document.body, {
    childList: true,
    subtree: true
});