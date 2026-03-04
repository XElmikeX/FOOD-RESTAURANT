// envioComplet.js - VERSIÓN MEJORADA CON SINCRONIZACIÓN ENTRE DISPOSITIVOS
console.log('🚀 envioComplet.js CARGADO - Versión con sincronización');

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
    
    // Verificar pedidos completados al cargar la página
    verificarPedidosCompletados();
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
            
            // 🔥 NUEVO: Guardar en localStorage para sincronizar con otros dispositivos
            guardarPedidoCompletado(pedidoId, data.mesaId);
            
            // Animar y eliminar la tarjeta
            eliminarTarjetaConAnimacion(card, pedidoId);
            
        } else {
            throw new Error(data.message || 'Error desconocido');
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        
        // Restaurar botón
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
        
        mostrarNotificacion('❌ Error al completar pedido', 'error');
    });
}

// 🔥 NUEVA FUNCIÓN: Guardar pedido completado en localStorage
function guardarPedidoCompletado(pedidoId, mesaId) {
    // Obtener la mesa actual
    const mesaActual = obtenerMesaIdNumerico();
    
    const completadoData = {
        pedidoId: pedidoId,
        mesaId: mesaActual || mesaId,
        timestamp: Date.now()
    };
    
    console.log('💾 Guardando pedido completado en localStorage:', completadoData);
    
    // Guardar en localStorage para otras pestañas/dispositivos
    localStorage.setItem('pedido_completado', JSON.stringify(completadoData));
    
    // También guardar en un historial para verificación al cargar
    guardarEnHistorialCompletados(pedidoId, mesaActual || mesaId);
    
    // Limpiar después de 3 segundos
    setTimeout(() => {
        localStorage.removeItem('pedido_completado');
    }, 3000);
}

// 🔥 NUEVA FUNCIÓN: Guardar en historial de completados
function guardarEnHistorialCompletados(pedidoId, mesaId) {
    const HISTORIAL_KEY = 'pedidos_completados';
    let historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY)) || [];
    
    // Agregar el nuevo pedido completado
    historial.push({
        pedidoId: pedidoId,
        mesaId: mesaId,
        timestamp: Date.now()
    });
    
    // Limpiar historial antiguo (mayor a 1 minuto)
    const ahora = Date.now();
    historial = historial.filter(item => (ahora - item.timestamp) < 60000); // 1 minuto
    
    localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));
}

// 🔥 NUEVA FUNCIÓN: Verificar pedidos completados al cargar
function verificarPedidosCompletados() {
    const HISTORIAL_KEY = 'pedidos_completados';
    const historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY)) || [];
    const mesaActual = obtenerMesaIdNumerico();
    
    if (!mesaActual || historial.length === 0) return;
    
    console.log('🔍 Verificando historial de completados:', historial);
    
    // Filtrar pedidos de esta mesa
    const pedidosDeEstaMesa = historial.filter(item => item.mesaId == mesaActual);
    
    pedidosDeEstaMesa.forEach(item => {
        const card = document.querySelector(`.pedido-card[data-pedido-id="${item.pedidoId}"]`);
        if (card) {
            console.log(`🗑️ Eliminando pedido ${item.pedidoId} desde historial`);
            eliminarTarjetaSinFetch(card, item.pedidoId);
        }
    });
}

// 🔥 NUEVA FUNCIÓN: Eliminar tarjeta sin hacer fetch (para sincronización)
function eliminarTarjetaSinFetch(card, pedidoId) {
    if (!card || !card.parentNode) return;
    
    // Animar eliminación
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        if (card.parentNode) {
            card.remove();
            verificarPedidosRestantes();
        }
    }, 300);
}

// 🔥 NUEVA FUNCIÓN: Extraer la lógica de eliminación de tarjeta
function eliminarTarjetaConAnimacion(card, pedidoId) {
    // Animación de eliminación
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    
    // Eliminar la tarjeta después de la animación
    setTimeout(() => {
        if (card.parentNode) {
            card.remove();
            verificarPedidosRestantes();
        }
    }, 300);
}

// 🔥 NUEVA FUNCIÓN: Verificar si quedan pedidos y mostrar mensaje
function verificarPedidosRestantes() {
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

// Función para obtener el ID de la mesa
function obtenerMesaIdNumerico() {
    const mesaIdElement = document.querySelector('.mesaEscojida .mesa-numero');
    if (mesaIdElement) {
        return mesaIdElement.textContent.replace('Mesa: ', '').trim();
    }
    return null;
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion-temp ${tipo}`;
    notificacion.innerHTML = mensaje;
    
    let colorFondo;
    switch(tipo) {
        case 'success':
            colorFondo = 'linear-gradient(135deg, #27ae60, #2ecc71)';
            break;
        case 'error':
            colorFondo = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            break;
        default:
            colorFondo = 'linear-gradient(135deg, #3498db, #2980b9)';
    }
    
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
        background: ${colorFondo};
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ===== ESCUCHAR CAMBIOS DE OTROS DISPOSITIVOS =====

// 🔥 NUEVO: Escuchar eventos de localStorage (para sincronización)
window.addEventListener('storage', function(e) {
    // Escuchar cuando se completa un pedido
    if (e.key === 'pedido_completado' && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            console.log('📡 Pedido completado detectado en otro dispositivo:', data);
            
            // Obtener mesa actual
            const mesaActual = obtenerMesaIdNumerico();
            
            // Solo procesar si es de la misma mesa
            if (mesaActual && data.mesaId == mesaActual) {
                const card = document.querySelector(`.pedido-card[data-pedido-id="${data.pedidoId}"]`);
                
                if (card) {
                    console.log(`🗑️ Eliminando pedido ${data.pedidoId} por solicitud de otro dispositivo`);
                    
                    // Agregar un pequeño retraso para evitar conflictos
                    setTimeout(() => {
                        eliminarTarjetaSinFetch(card, data.pedidoId);
                        
                        // Mostrar notificación
                        mostrarNotificacion('📱 Pedido completado en otro dispositivo', 'info');
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error procesando pedido completado:', error);
        }
    }
    
    // 🔥 También escuchar cambios de estado (para mantener consistencia)
    if (e.key === 'ultimo_cambio' && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            const mesaActual = obtenerMesaIdNumerico();
            
            if (mesaActual && data.mesaId == mesaActual) {
                const card = document.querySelector(`.pedido-card[data-pedido-id="${data.pedidoId}"]`);
                
                // Si el estado cambió a "listo", aseguramos que el botón de confirmación aparezca
                if (card && data.estado === 'listo') {
                    const confir = card.querySelector(".confirmacion-container");
                    if (confir) {
                        confir.classList.add('aparicion');
                    }
                }
            }
        } catch (error) {
            console.error('Error procesando cambio de estado:', error);
        }
    }
});

// También observar cambios en el DOM
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            // Buscar nuevos botones de confirmación
            document.querySelectorAll('.btn-confirmacion').forEach(boton => {
                // Verificar si ya tiene el evento
                if (!boton.hasAttribute('data-evento-asignado')) {
                    boton.removeEventListener('click', manejarClickCompletar);
                    boton.addEventListener('click', manejarClickCompletar);
                    boton.setAttribute('data-evento-asignado', 'true');
                }
            });
        }
    });
});

// Observar cambios en el cuerpo del documento
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Verificar historial periódicamente (por si acaso)
setInterval(verificarPedidosCompletados, 5000);

// Agregar estilos para notificaciones si no existen
if (!document.querySelector('#estilos-sincronizacion')) {
    const style = document.createElement('style');
    style.id = 'estilos-sincronizacion';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            to { opacity: 0; transform: translateY(-10px); }
        }
        
        .notificacion-temp {
            display: flex;
            align-items: center;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);
}