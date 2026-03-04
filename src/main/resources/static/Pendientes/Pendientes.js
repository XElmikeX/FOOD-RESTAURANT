// Variables para control de concurrencia
let peticionesPendientes = new Map();

document.addEventListener('DOMContentLoaded', function() {
    console.log('Pendientes.js cargado - VERSIÓN CORREGIDA');
    
    // Cargar estados iniciales
    cargarEstadosIniciales();
    
    // POLLING para cambios de estado (cada 3 segundos)
    setInterval(() => {
        console.log('🔄 Actualizando estados desde servidor (polling)...');
        cargarEstadosIniciales();
    }, 3000);
    
    // POLLING específico para pedidos completados
    setInterval(() => {
        verificarPedidosCompletados();
    }, 3000);
    
    // Agregar evento a todos los botones de estado
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const card = this.closest('.pedido-card');
            const pedidoId = card.dataset.pedidoId;
            
            if (peticionesPendientes.has(pedidoId)) {
                console.log(`⏳ Ya hay una petición para pedido ${pedidoId}`);
                return;
            }
            
            let nuevoEstado = '';
            if (this.classList.contains('btn-pendiente')) {
                nuevoEstado = 'pendiente';
            } else if (this.classList.contains('btn-proceso')) {
                nuevoEstado = 'proceso';
            } else if (this.classList.contains('btn-listo')) {
                nuevoEstado = 'listo';
            }
            
            // ACTUALIZACIÓN INMEDIATA EN DISPOSITIVO LOCAL
            aplicarEstadoUI(card, nuevoEstado);
            
            // Si es "listo", mostrar el botón de confirmación
            const confir = card.querySelector(".confirmacion-container");
            if (nuevoEstado === 'listo') {
                confir.classList.add('aparicion');
            } else {
                confir.classList.remove('aparicion');
            }
            
            // Actualizar estado en la BD
            actualizarEstadoPedido(pedidoId, nuevoEstado, card);
        });
    });
    
    // Agregar evento a los botones de "Pedido Realizado"
    document.querySelectorAll('.btn-confirmacion').forEach(boton => {
        boton.addEventListener('click', manejarClickCompletar);
    });
});

// Función para aplicar cambios visuales inmediatos
function aplicarEstadoUI(card, estado) {
    if (!card) return;
    
    const header = card.querySelector(".card-header");
    const botonPendiente = card.querySelector('.btn-pendiente');
    const botonProceso = card.querySelector('.btn-proceso');
    const botonListo = card.querySelector('.btn-listo');
    
    // Remover clases actuales
    card.classList.remove('pendiente', 'proceso', 'listo');
    if (header) {
        header.classList.remove('pend', 'proce', 'list');
    }
    
    // Remover activo de todos los botones
    [botonPendiente, botonProceso, botonListo].forEach(btn => {
        if (btn) btn.classList.remove('activo');
    });
    
    // Aplicar nuevo estado
    card.classList.add(estado);
    
    if (estado === 'pendiente') {
        if (header) header.classList.add('pend');
        if (botonPendiente) botonPendiente.classList.add('activo');
    } else if (estado === 'proceso') {
        if (header) header.classList.add('proce');
        if (botonProceso) botonProceso.classList.add('activo');
    } else if (estado === 'listo') {
        if (header) header.classList.add('list');
        if (botonListo) botonListo.classList.add('activo');
    }
}

function cargarEstadosIniciales() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.pedidos.forEach(pedidoInfo => {
                    const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoInfo.id}"]`);
                    if (pedidoCard) {
                        aplicarEstadoUI(pedidoCard, pedidoInfo.estado);
                        
                        const confir = pedidoCard.querySelector(".confirmacion-container");
                        if (pedidoInfo.estado === 'listo') {
                            confir.classList.add('aparicion');
                        } else {
                            confir.classList.remove('aparicion');
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error cargando estados:', error));
}

function actualizarEstadoPedido(pedidoId, nuevoEstado, card) {
    peticionesPendientes.set(pedidoId, true);
    
    fetch(`/api/pedidos/actualizar-estado/${pedidoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Estado actualizado:', data);
        } else {
            console.error('❌ Error en servidor');
            cargarEstadosIniciales();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    })
    .finally(() => {
        peticionesPendientes.delete(pedidoId);
    });
}

function obtenerMesaIdNumerico() {
    const mesaIdElement = document.querySelector('.mesaEscojida .mesa-numero');
    if (mesaIdElement) {
        return mesaIdElement.textContent.replace('Mesa: ', '').trim();
    }
    return null;
}

// Función para verificar pedidos completados
function verificarPedidosCompletados() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const pedidosCompletadosBD = new Set();
                
                data.pedidos.forEach(pedido => {
                    if (pedido.completado === true) {
                        pedidosCompletadosBD.add(String(pedido.id));
                    }
                });
                
                document.querySelectorAll('.pedido-card').forEach(card => {
                    const pedidoId = card.dataset.pedidoId;
                    
                    if (pedidosCompletadosBD.has(pedidoId)) {
                        console.log(`🗑️ Eliminando pedido ${pedidoId} - completado en BD`);
                        
                        card.style.transition = 'all 0.3s ease';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.8)';
                        
                        setTimeout(() => {
                            if (card.parentNode) {
                                card.remove();
                                verificarSiQuedanPedidos();
                            }
                        }, 300);
                    }
                });
            }
        })
        .catch(error => console.error('Error:', error));
}

function verificarSiQuedanPedidos() {
    const pedidosRestantes = document.querySelectorAll('.pedido-card');
    
    if (pedidosRestantes.length === 0) {
        const container = document.querySelector('.cards-pedidos-container');
        if (container) {
            container.style.display = 'none';
        }
        
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
}

// Función para manejar click en "Pedido Realizado"
function manejarClickCompletar(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 Pedido Realizado clickeado');
    
    const boton = event.currentTarget;
    const card = boton.closest('.pedido-card');
    
    if (!card) return;
    
    const pedidoId = card.dataset.pedidoId;
    if (!pedidoId) return;
    
    // Cambiar botón a estado de carga
    const textoOriginal = boton.innerHTML;
    boton.disabled = true;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    fetch(`/completarPedido/${pedidoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Pedido completado');
            
            // Eliminar la carta
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                if (card.parentNode) {
                    card.remove();
                    verificarSiQuedanPedidos();
                }
            }, 300);
            
        } else {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
    });
}

// Escuchar cambios en localStorage para otras pestañas
window.addEventListener('storage', function(e) {
    if (e.key === 'ultimo_completado') {
        cargarEstadosIniciales();
        verificarPedidosCompletados();
    }
});