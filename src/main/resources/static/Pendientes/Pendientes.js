document.addEventListener('DOMContentLoaded', function() {
    console.log('Pendientes.js cargado - Versión BD');
    
    // Cargar estados iniciales desde la BD
    cargarEstadosIniciales();
    
    // Agregar evento a todos los botones de estado
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
});

function cargarEstadosIniciales() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Estados cargados:', data);
                
                data.pedidos.forEach(pedidoInfo => {
                    const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoInfo.id}"]`);
                    if (pedidoCard) {
                        aplicarEstadoAPedido(pedidoCard, pedidoInfo.estado);
                    }
                });
            }
        })
        .catch(error => console.error('Error cargando estados:', error));
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
            
            // 🔥 IMPORTANTE: Disparar evento para actualizar el MOZO
            window.dispatchEvent(new CustomEvent('pedidoActualizado', { 
                detail: { 
                    mesaId: data.mesaId,
                    pedidoId: pedidoId,
                    nuevoEstado: nuevoEstado
                }
            }));
            
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
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const icono = document.createElement('i');
    icono.className = `fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`;
    notificacion.insertBefore(icono, notificacion.firstChild);
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}