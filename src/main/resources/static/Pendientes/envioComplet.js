// envioComplet.js - VERSIÓN MEJORADA CON SINCRONIZACIÓN ROBUSTA
console.log('🚀 envioComplet.js CARGADO - Versión con sincronización robusta');

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
    
    // 🔥 NUEVO: Verificar periódicamente si hay pedidos que deberían desaparecer
    setInterval(verificarPedidosCompletados, 2000);
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
            
            // 🔥 MEJORADO: Guardar en localStorage con timestamp ÚNICO
            const timestamp = Date.now();
            const completadoData = {
                pedidoId: pedidoId,
                mesaId: data.mesaId,
                timestamp: timestamp,
                action: 'completado'
            };
            
            console.log('💾 Guardando pedido completado en localStorage:', completadoData);
            
            // Guardar en localStorage para otras pestañas/dispositivos
            localStorage.setItem('pedido_completado', JSON.stringify(completadoData));
            
            // También guardar en un historial persistente
            guardarEnHistorialCompletados(pedidoId, data.mesaId, timestamp);
            
            // 🔥 FORZAR la sincronización inmediata en el MISMO dispositivo
            // (por si acaso el evento storage no se dispara)
            forzarSincronizacionLocal(pedidoId, data.mesaId);
            
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
    });
}

// 🔥 NUEVA FUNCIÓN: Forzar sincronización local
function forzarSincronizacionLocal(pedidoId, mesaId) {
    console.log('🔄 Forzando sincronización local para pedido:', pedidoId);
    
    // Disparar evento personalizado
    const evento = new CustomEvent('pedidoCompletadoLocal', {
        detail: { pedidoId: pedidoId, mesaId: mesaId }
    });
    window.dispatchEvent(evento);
    
    // Verificar inmediatamente
    setTimeout(() => {
        verificarYEliminarPedido(pedidoId, mesaId);
    }, 100);
}

// 🔥 NUEVA FUNCIÓN: Verificar y eliminar pedido específico
function verificarYEliminarPedido(pedidoId, mesaId) {
    const mesaActual = obtenerMesaIdNumerico();
    if (mesaActual != mesaId) return;
    
    const card = document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`);
    if (card) {
        console.log(`🗑️ Eliminando pedido ${pedidoId} por verificación forzada`);
        eliminarTarjetaSinFetch(card, pedidoId);
    }
}

// 🔥 NUEVA FUNCIÓN: Guardar en historial de completados (persistente)
function guardarEnHistorialCompletados(pedidoId, mesaId, timestamp) {
    const HISTORIAL_KEY = 'pedidos_completados';
    let historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY)) || [];
    
    // Verificar si ya existe para evitar duplicados
    const existe = historial.some(item => item.pedidoId == pedidoId && item.mesaId == mesaId);
    
    if (!existe) {
        // Agregar el nuevo pedido completado
        historial.push({
            pedidoId: pedidoId,
            mesaId: mesaId,
            timestamp: timestamp || Date.now()
        });
        
        // Limpiar historial antiguo (mayor a 5 minutos)
        const ahora = Date.now();
        historial = historial.filter(item => (ahora - item.timestamp) < 300000); // 5 minutos
        
        localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));
        console.log('💾 Historial actualizado:', historial);
    }
}

// 🔥 MODIFICADA: Verificar pedidos completados al cargar
function verificarPedidosCompletados() {
    const HISTORIAL_KEY = 'pedidos_completados';
    const historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY)) || [];
    const mesaActual = obtenerMesaIdNumerico();
    
    if (!mesaActual || historial.length === 0) return;
    
    console.log('🔍 Verificando historial de completados:', historial);
    
    // Filtrar pedidos de esta mesa
    const pedidosDeEstaMesa = historial.filter(item => item.mesaId == mesaActual);
    let eliminados = 0;
    
    pedidosDeEstaMesa.forEach(item => {
        const card = document.querySelector(`.pedido-card[data-pedido-id="${item.pedidoId}"]`);
        if (card) {
            console.log(`🗑️ Eliminando pedido ${item.pedidoId} desde historial`);
            eliminarTarjetaSinFetch(card, item.pedidoId);
            eliminados++;
        }
    });
    
    if (eliminados > 0) {
        console.log(`✅ Eliminados ${eliminados} pedidos del historial`);
    }
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

// 🔥 NUEVA FUNCIÓN: Eliminar tarjeta con animación
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

// ===== ESCUCHAR CAMBIOS DE OTROS DISPOSITIVOS =====

// 🔥 MEJORADO: Escuchar eventos de localStorage
window.addEventListener('storage', function(e) {
    console.log('📡 Evento storage detectado:', e.key, e.newValue);
    
    // Escuchar cuando se completa un pedido
    if (e.key === 'pedido_completado' && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            console.log('📡 Pedido completado detectado en otro dispositivo:', data);
            
            // Procesar inmediatamente
            procesarPedidoCompletado(data);
            
        } catch (error) {
            console.error('Error procesando pedido completado:', error);
        }
    }
});

// 🔥 NUEVO: Escuchar evento personalizado
window.addEventListener('pedidoCompletadoLocal', function(e) {
    console.log('📡 Evento local detectado:', e.detail);
    procesarPedidoCompletado(e.detail);
});

// 🔥 NUEVA FUNCIÓN: Procesar pedido completado
function procesarPedidoCompletado(data) {
    // Obtener mesa actual
    const mesaActual = obtenerMesaIdNumerico();
    
    // Solo procesar si es de la misma mesa
    if (mesaActual && data.mesaId == mesaActual) {
        console.log(`🔍 Buscando pedido ${data.pedidoId} en mesa ${mesaActual}`);
        
        const card = document.querySelector(`.pedido-card[data-pedido-id="${data.pedidoId}"]`);
        
        if (card) {
            console.log(`🗑️ Eliminando pedido ${data.pedidoId} por solicitud externa`);
            
            // Agregar al historial si no existe
            guardarEnHistorialCompletados(data.pedidoId, data.mesaId, data.timestamp);
            
            // Eliminar con animación
            setTimeout(() => {
                eliminarTarjetaSinFetch(card, data.pedidoId);
            }, 100);
        } else {
            console.log(`⚠️ Pedido ${data.pedidoId} no encontrado en el DOM, quizás ya fue eliminado`);
            
            // Aún así, guardar en historial para prevenir reaparición
            guardarEnHistorialCompletados(data.pedidoId, data.mesaActual, data.timestamp);
        }
    }
}

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