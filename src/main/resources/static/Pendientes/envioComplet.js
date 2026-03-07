// envioComplet.js - VERSIÓN QUE SOLO RECARGA CON NUEVOS COMPLETADOS = true
console.log('🚀 envioComplet.js CARGADO - Solo recarga con nuevos completados');

// Variables de control
let recargaProgramada = false;
let ultimosCompletados = new Set(); // Guarda IDs de pedidos completados que ya vimos

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, configurando event delegation...');
    
    // Configurar event delegation para los botones de confirmación
    configurarEventDelegation();
    
    // Cargar IDs de pedidos completados iniciales
    cargarCompletadosIniciales();
    
    // Iniciar verificación de NUEVOS completados cada 3 segundos
    setInterval(() => {
        console.log('🔍 Verificando NUEVOS pedidos completados...');
        verificarNuevosCompletados();
    }, 3000);
});

// Configurar event delegation
function configurarEventDelegation() {
    const container = document.querySelector('.container');
    if (!container) {
        console.error('❌ No se encontró el contenedor principal');
        return;
    }
    
    container.addEventListener('click', function(event) {
        const btn = event.target.closest('.btn-confirmacion');
        if (btn) {
            event.preventDefault();
            event.stopPropagation();
            manejarClickCompletar(btn);
        }
    });
    
    console.log('✅ Event delegation configurado');
}

// 🔥 Cargar IDs de pedidos completados iniciales
function cargarCompletadosIniciales() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Guardar IDs de pedidos que YA están completados
                data.pedidos.forEach(pedido => {
                    if (pedido.completado === true) {
                        ultimosCompletados.add(pedido.id);
                        console.log(`📌 Completado inicial guardado: ${pedido.id}`);
                    }
                });
                console.log(`📊 Total completados iniciales: ${ultimosCompletados.size}`);
            }
        })
        .catch(error => console.error('Error cargando completados iniciales:', error));
}

// 🔥 VERIFICAR SOLO NUEVOS COMPLETADOS
function verificarNuevosCompletados() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Buscar pedidos completados = true
                const pedidosCompletados = data.pedidos.filter(p => p.completado === true);
                
                // Verificar si hay algún completado NUEVO (que no esté en nuestro Set)
                let hayNuevoCompletado = false;
                
                pedidosCompletados.forEach(pedido => {
                    if (!ultimosCompletados.has(pedido.id)) {
                        console.log(`🔥 NUEVO COMPLETADO DETECTADO: ${pedido.id}`);
                        ultimosCompletados.add(pedido.id);
                        hayNuevoCompletado = true;
                    }
                });
                
                // SOLO recargar si hay NUEVOS completados y no hay recarga programada
                if (hayNuevoCompletado && !recargaProgramada) {
                    console.log('🔄 Programando recarga por NUEVOS completados');
                    recargaProgramada = true;
                    
                    // Refresca para que no se vea el pedido completado en la lista
                    window.location.reload();
                    
                } else {
                    console.log('⏭️ Sin NUEVOS completados');
                }
            }
        })
        .catch(error => console.error('Error verificando completados:', error));
}

// Obtener ID de mesa
function obtenerMesaIdNumerico() {
    const mesaElement = document.querySelector('.mesaEscojida .mesa-numero');
    if (mesaElement) {
        return mesaElement.textContent.replace('Mesa: ', '').trim();
    }
    return null;
}

// Manejador para botón "Pedido Realizado"
function manejarClickCompletar(boton) {
    console.log('🎯 BOTÓN PEDIDO REALIZADO CLICKEADO');
    
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
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completando...';
    
    // Enviar petición para completar el pedido
    fetch(`/completarPedido/${pedidoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('✅ Pedido completado con éxito en BD');
            
            // Agregar este pedido a nuestro Set de completados
            ultimosCompletados.add(parseInt(pedidoId));
            
            // Guardar en localStorage para otras pestañas
            guardarCompletadoEnStorage(pedidoId, data.mesaId);
            
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
                        mostrarMensajeSinPedidos();
                    }
                    
                    // Este dispositivo también recargará cuando detecte el cambio
                    // Pero también podemos recargar inmediatamente si queremos
                    if (!recargaProgramada) {
                        recargaProgramada = true;
                        setTimeout(() => window.location.reload(), 1500);
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

// Guardar en localStorage para otras pestañas
function guardarCompletadoEnStorage(pedidoId, mesaId) {
    localStorage.setItem('nuevo_completado', JSON.stringify({
        pedidoId: pedidoId,
        mesaId: mesaId,
        timestamp: Date.now()
    }));
    
    // Limpiar después de 2 segundos
    setTimeout(() => {
        localStorage.removeItem('nuevo_completado');
    }, 2000);
}

// Mostrar mensaje cuando no hay pedidos
function mostrarMensajeSinPedidos() {
    const container = document.querySelector('.cards-pedidos-container');
    if (container) {
        container.style.display = 'none';
    }
    
    let fullWidthContainer = document.querySelector('.fullwidth-message-container');
    
    if (!fullWidthContainer) {
        fullWidthContainer = document.createElement('div');
        fullWidthContainer.className = 'fullwidth-message-container';
        
        const mainContainer = document.querySelector('.container');
        const cardsContainer = document.querySelector('.cards-pedidos-container');
        
        if (cardsContainer && cardsContainer.parentNode) {
            cardsContainer.parentNode.insertBefore(fullWidthContainer, cardsContainer.nextSibling);
        } else {
            mainContainer.appendChild(fullWidthContainer);
        }
    }
    
    fullWidthContainer.style.display = 'block';
    fullWidthContainer.innerHTML = `
        <div class="sin-pedidos-fullwidth">
            <i class="fas fa-check-circle"></i>
            <h3>¡No hay pedidos pendientes!</h3>
            <p>Esta mesa no tiene pedidos en espera. Todos han sido procesados.</p>
        </div>
    `;
}

// Escuchar cambios en localStorage (otras pestañas)
window.addEventListener('storage', function(e) {
    if (e.key === 'nuevo_completado' && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            console.log('📡 Nuevo completado detectado en otra pestaña:', data);
            
            const mesaActual = obtenerMesaIdNumerico();
            
            // Solo recargar si es la misma mesa y no está ya programado
            if (mesaActual && data.mesaId == mesaActual && !recargaProgramada) {
                console.log('🔥 Recargando por completado desde otra pestaña');
                
                // Agregar a nuestro Set para no recargar de nuevo
                ultimosCompletados.add(parseInt(data.pedidoId));
                
                recargaProgramada = true;
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error('Error procesando storage:', error);
        }
    }
});

// Agregar estilos necesarios
if (!document.querySelector('#recarga-styles')) {
    const style = document.createElement('style');
    style.id = 'recarga-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notificacion-recarga {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            pointer-events: none;
            z-index: 9999;
        }
    `;
    document.head.appendChild(style);
}