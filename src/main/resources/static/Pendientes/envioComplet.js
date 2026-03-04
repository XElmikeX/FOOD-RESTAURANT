// envioComplet.js - VERSIÓN MEJORADA CON SINCRONIZACIÓN
console.log('🚀 envioComplet.js CARGADO - Con sincronización entre dispositivos');

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, buscando botones de pedido realizado...');
    
    // Buscar todos los botones de confirmación
    const botones = document.querySelectorAll('.btn-confirmacion');
    console.log(`📊 Se encontraron ${botones.length} botones de confirmación`);
    
    // Asignar evento a cada botón
    botones.forEach((boton, index) => {
        console.log(`Asignando evento al botón ${index + 1}`);
        boton.removeEventListener('click', manejarClickCompletar);
        boton.addEventListener('click', manejarClickCompletar);
    });
});

// Variable para controlar peticiones en curso
const peticionesCompletar = new Map();

// Función para manejar el click
function manejarClickCompletar(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 BOTÓN PEDIDO REALIZADO CLICKEADO');
    
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
    
    // Verificar si ya hay una petición para este pedido
    if (peticionesCompletar.has(pedidoId)) {
        console.log(`⏳ Ya se está procesando el pedido ${pedidoId}`);
        mostrarNotificacion('Procesando...', 'info');
        return;
    }
    
    // Marcar petición en curso
    peticionesCompletar.set(pedidoId, true);
    
    // Guardar referencia a la mesa para luego
    const mesaElement = document.querySelector('.mesa-numero');
    const mesaId = mesaElement ? mesaElement.textContent.replace('Mesa: ', '').trim() : null;
    
    // Guardar texto original
    const textoOriginal = boton.innerHTML;
    
    // Cambiar botón a estado de carga
    boton.disabled = true;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completando...';
    
    // 🔥 PASO 1: ELIMINAR INMEDIATAMENTE EN DISPOSITIVO LOCAL
    eliminarPedidoLocal(card, pedidoId);
    
    // 🔥 PASO 2: ENVIAR AL SERVIDOR PARA ELIMINAR EN BD
    fetch(`/completarPedido/${pedidoId}`, {
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
            console.log('✅ Pedido completado con éxito en servidor');
            
            // 🔥 PASO 3: NOTIFICAR A OTROS DISPOSITIVOS
            notificarPedidoCompletado(pedidoId, mesaId);
            
            mostrarNotificacion('✅ Pedido realizado', 'success');
            
        } else {
            throw new Error(data.message || 'Error desconocido');
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        mostrarNotificacion('❌ Error al completar', 'error');
        
        // Restaurar botón solo si la tarjeta aún existe
        if (document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`)) {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    })
    .finally(() => {
        peticionesCompletar.delete(pedidoId);
    });
}

// 🔥 NUEVA FUNCIÓN: Eliminar pedido localmente con animación
function eliminarPedidoLocal(card, pedidoId) {
    console.log(`🗑️ Eliminando pedido ${pedidoId} localmente`);
    
    // Marcar para que no sea restaurado por polling
    if (card) {
        card.dataset.eliminado = 'true';
        card.dataset.momentoEliminacion = Date.now().toString();
    }
    
    // Animación de eliminación
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    
    // Eliminar la tarjeta después de la animación
    setTimeout(() => {
        if (card && card.parentNode) {
            card.remove();
            verificarSiQuedanPedidos();
        }
    }, 300);
}

// 🔥 NUEVA FUNCIÓN: Notificar a otros dispositivos
function notificarPedidoCompletado(pedidoId, mesaId) {
    console.log(`📢 Notificando pedido ${pedidoId} completado a otros dispositivos`);
    
    // Guardar en localStorage para otras pestañas del mismo navegador
    const completadosKey = 'pedidos_completados';
    let completados = JSON.parse(localStorage.getItem(completadosKey)) || {};
    
    completados[pedidoId] = {
        pedidoId: pedidoId,
        mesaId: mesaId,
        timestamp: Date.now()
    };
    
    localStorage.setItem(completadosKey, JSON.stringify(completados));
    
    // Disparar evento específico para este pedido
    localStorage.setItem('ultimo_completado', JSON.stringify({
        pedidoId: pedidoId,
        mesaId: mesaId,
        timestamp: Date.now()
    }));
    
    // Limpiar después de 3 segundos
    setTimeout(() => {
        localStorage.removeItem('ultimo_completado');
    }, 3000);
}

// 🔥 NUEVA FUNCIÓN: Verificar si quedan pedidos después de eliminar
function verificarSiQuedanPedidos() {
    const pedidosRestantes = document.querySelectorAll('.pedido-card:not([data-eliminado="true"])');
    console.log(`📋 Pedidos restantes: ${pedidosRestantes.length}`);
    
    if (pedidosRestantes.length === 0) {
        // Ocultar el contenedor de pedidos
        const container = document.querySelector('.cards-pedidos-container');
        if (container) {
            container.style.display = 'none';
        }
        
        // Mostrar mensaje de no hay pedidos
        mostrarMensajeSinPedidos();
    }
}

function mostrarMensajeSinPedidos() {
    // Buscar o crear contenedor para el mensaje centrado
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
        </div>
    `;
}

function mostrarNotificacion(mensaje, tipo) {
    const notificacionesPrevias = document.querySelectorAll('.notificacion-temp');
    notificacionesPrevias.forEach(n => n.remove());
    
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
        case 'info':
            colorFondo = 'linear-gradient(135deg, #3498db, #2980b9)';
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
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// También asignar eventos si hay cambios en el DOM
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

observer.observe(document.body, {
    childList: true,
    subtree: true
});