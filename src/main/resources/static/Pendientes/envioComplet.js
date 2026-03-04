document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de estados con BD cargado');
    
    // Verificar si hay pedidos en la página
    verificarPedidosExistentes();
    
    // Cargar estados iniciales desde la BD
    cargarEstadosIniciales();
    
    // Agregar evento a todos los botones de estado (pendiente/proceso/listo)
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const card = this.closest('.pedido-card');
            const pedidoId = card.dataset.pedidoId;
            
            let nuevoEstado = '';
            if (this.classList.contains('btn-pendiente')) {
                nuevoEstado = 'pendiente';
            } else if (this.classList.contains('btn-proceso')) {
                nuevoEstado = 'proceso';
            } else if (this.classList.contains('btn-listo')) {
                nuevoEstado = 'listo';
            }
            
            // Actualizar estado en la BD
            actualizarEstadoPedido(pedidoId, nuevoEstado, card, this);
        });
    });
    
    // Manejar el formulario de "Pedido Realizado" (botón de completar)
    document.querySelectorAll('.form-completar').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // ❌ EVITA LA REDIRECCIÓN
            
            const form = this;
            const button = form.querySelector('.btn-confirmacion');
            const originalText = button.innerHTML;
            const card = form.closest('.pedido-card');
            const pedidoId = card.dataset.pedidoId;
            
            // Mostrar estado de carga
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Completando...</span>';
            
            // Enviar la petición AJAX al endpoint de completar
            fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Éxito - Animación de eliminación
                    card.style.transition = 'all 0.3s ease';
                    card.style.transform = 'scale(0.8)';
                    card.style.opacity = '0';
                    
                    // Notificación de éxito
                    mostrarNotificacion('✅ Pedido enviado a facturación', 'success');
                    
                    // Eliminar la tarjeta después de la animación
                    setTimeout(() => {
                        card.remove();
                        
                        // Actualizar los números de los pedidos restantes
                        actualizarNumerosPedidos();
                        
                        // Verificar si no hay más tarjetas (SOLO para redirigir)
                        const cardsRestantes = document.querySelectorAll('.pedido-card');
                        if (cardsRestantes.length === 0) {
                            // Mostrar mensaje y redirigir después de 2 segundos
                            mostrarMensajeSinPedidos();
                            setTimeout(() => {
                                window.location.href = '/Rol/Cocinero';
                            }, 2000);
                        }
                        
                    }, 300);
                } else {
                    throw new Error(data.message || 'Error al completar el pedido');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                button.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Error</span>';
                button.disabled = false;
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 3000);
                
                mostrarNotificacion('❌ Error al completar', 'error');
            });
        });
    });
});

// Función para verificar si hay pedidos (solo para carga inicial)
function verificarPedidosExistentes() {
    const cardsPedidos = document.querySelectorAll('.pedido-card');
    
    console.log(`Verificando pedidos: ${cardsPedidos.length} encontrados`);
    
    if (cardsPedidos.length === 0) {
        console.log('No hay pedidos, redirigiendo a /Rol/Cocinero');
        mostrarMensajeSinPedidos();
        setTimeout(() => {
            window.location.href = '/Rol/Cocinero';
        }, 2000);
    }
}

// Función para mostrar mensaje cuando no hay pedidos
function mostrarMensajeSinPedidos() {
    const container = document.querySelector('.cards-pedidos-container');
    if (container) {
        container.innerHTML = `
            <div class="sin-pedidos" style="grid-column: 1/-1; text-align: center; padding: 60px 30px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <i class="fas fa-check-circle" style="font-size: 5em; color: #27ae60; margin-bottom: 20px;"></i>
                <h3 style="font-size: 2em; color: #2c3e50; margin-bottom: 15px;">¡No hay pedidos pendientes!</h3>
                <p style="font-size: 1.2em; color: #7f8c8d; margin-bottom: 30px;">Todos los pedidos han sido procesados.</p>
            </div>
        `;
    }
}

// Función para actualizar los números de los pedidos después de eliminar uno
function actualizarNumerosPedidos() {
    const pedidos = document.querySelectorAll('.pedido-card');
    pedidos.forEach((pedido, index) => {
        const numeroElement = pedido.querySelector('.card-numero');
        if (numeroElement) {
            numeroElement.textContent = index + 1;
        }
    });
}

function cargarEstadosIniciales() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Estados cargados:', data);
                
                if (data.pedidos.length === 0) {
                    // Si no hay pedidos en la BD, redirigir
                    verificarPedidosExistentes();
                    return;
                }
                
                data.pedidos.forEach(pedidoInfo => {
                    const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoInfo.id}"]`);
                    if (pedidoCard) {
                        aplicarEstadoAPedido(pedidoCard, pedidoInfo.estado);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error cargando estados:', error);
            // En caso de error, igual verificamos si hay pedidos visibles
            verificarPedidosExistentes();
        });
}

function actualizarEstadoPedido(pedidoId, nuevoEstado, card, botonClickeado) {
    // Mostrar indicador de carga
    const originalText = botonClickeado.innerHTML;
    botonClickeado.disabled = true;
    botonClickeado.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
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
            console.log('Estado actualizado:', data);
            
            // Aplicar el nuevo estado visualmente
            aplicarEstadoAPedido(card, nuevoEstado);
            
            // Mostrar contenedor de confirmación si es "listo"
            const confir = card.querySelector(".confirmacion-container");
            if (nuevoEstado === 'listo') {
                confir.classList.add('aparicion');
            } else {
                confir.classList.remove('aparicion');
            }
            
            // Notificación de éxito
            mostrarNotificacion(`✅ Pedido marcado como ${nuevoEstado}`, 'success');
        } else {
            mostrarNotificacion('❌ Error al actualizar', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error de conexión', 'error');
    })
    .finally(() => {
        // Restaurar botón
        botonClickeado.disabled = false;
        botonClickeado.innerHTML = originalText;
    });
}

function aplicarEstadoAPedido(card, estado) {
    const header = card.querySelector(".card-header");
    const confir = card.querySelector(".confirmacion-container");
    
    // Remover clases actuales
    card.classList.remove('pendiente', 'proceso', 'listo');
    header.classList.remove('pend', 'proce', 'list');
    
    // Remover activo de todos los botones
    card.querySelectorAll('.btn-estado').forEach(btn => {
        btn.classList.remove('activo');
    });
    
    // Aplicar nuevo estado
    card.classList.add(estado);
    
    if (estado === 'pendiente') {
        header.classList.add('pend');
        card.querySelector('.btn-pendiente').classList.add('activo');
    } else if (estado === 'proceso') {
        header.classList.add('proce');
        card.querySelector('.btn-proceso').classList.add('activo');
    } else if (estado === 'listo') {
        header.classList.add('list');
        card.querySelector('.btn-listo').classList.add('activo');
        confir.classList.add('aparicion');
    }
}

function obtenerMesaIdNumerico() {
    const mesaIdElement = document.querySelector('.mesaEscojida .mesa-numero');
    if (mesaIdElement) {
        return mesaIdElement.textContent.replace('Mesa: ', '').trim();
    }
    return null;
}

function mostrarNotificacion(mensaje, tipo) {
    // Eliminar notificaciones anteriores
    const notificacionesPrevias = document.querySelectorAll('.notificacion-temp');
    notificacionesPrevias.forEach(n => n.remove());
    
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion-temp ${tipo}`;
    notificacion.innerHTML = mensaje;
    
    // Estilos para la notificación según el tipo
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
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    // Agregar ícono según el tipo
    const icono = document.createElement('i');
    icono.className = `fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`;
    notificacion.insertBefore(icono, notificacion.firstChild);
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Agregar estilos para las animaciones si no existen
if (!document.querySelector('#animation-styles')) {
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .notificacion-temp {
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
    `;
    document.head.appendChild(style);
}