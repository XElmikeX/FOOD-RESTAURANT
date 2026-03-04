// Mozo.js - Versión actualizada con badge de completado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mozo.js cargado - Versión con detección de facturación');
    
    // Cargar estados iniciales desde BD
    cargarEstadosPedidos();
    
    // Escuchar evento personalizado de actualización de pedidos
    window.addEventListener('pedidoActualizado', function(e) {
        console.log('Pedido actualizado en mesa:', e.detail.mesaId);
        cargarEstadosPedidos();
    });
    
    // 🔥 NUEVO: Escuchar evento de facturación
    window.addEventListener('mesaFacturada', function(e) {
        console.log('💰 Mesa facturada detectada en Mozo:', e.detail.mesaId);
        // Recargar inmediatamente los estados
        cargarEstadosPedidos();
        mostrarNotificacion(`Mesa ${e.detail.mesaId} facturada`, 'info');
    });
    
    // 🔥 NUEVO: Escuchar cambios en localStorage (para otras pestañas)
    window.addEventListener('storage', function(e) {
        if (e.key === 'mesa_facturada' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                console.log('💰 Mesa facturada detectada en otra pestaña:', data.mesaId);
                cargarEstadosPedidos();
            } catch (error) {
                console.error('Error parseando evento de facturación:', error);
            }
        }
    });
    
    // Actualizar cada 3 segundos
    setInterval(cargarEstadosPedidos, 3000);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('Mozo.js cargado - Versión BD');
    
    // Cargar estados iniciales desde BD
    cargarEstadosPedidos();
    
    // Escuchar evento personalizado de actualización de pedidos
    window.addEventListener('pedidoActualizado', function(e) {
        console.log('Pedido actualizado en mesa:', e.detail.mesaId);
        cargarEstadosPedidos();
    });
    
    // Escuchar evento personalizado de facturación
    window.addEventListener('pedidoFacturado', function(e) {
        console.log('Pedido facturado:', e.detail.mesaId);
        cargarEstadosPedidos();
    });
    
    // Actualizar cada 3 segundos
    setInterval(cargarEstadosPedidos, 3000);
});

function cargarEstadosPedidos() {
    console.log('Cargando estados de pedidos desde BD...');
    
    fetch('/api/pedidos/todas-mesas-estados')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('📦 Datos recibidos de BD:', data);
                
                // Procesar mesas con pedidos activos (solo donde el cocinero interactuó)
                const mesasActivas = [];
                let totalProceso = 0;
                let totalListo = 0;
                let totalCompletado = 0;
                
                data.mesas.forEach(mesa => {
                    const estados = mesa.estados;
                    
                    // Contar proceso, listo y completado para los badges
                    mesasActivas.push({
                        mesaId: String(mesa.id),
                        id: mesa.id,
                        nombre: mesa.nombre || 'Mesa',
                        timestamp: mesa.timestamp || new Date().toISOString(),
                        pedidos: mesa.pedidos || [],
                        stats: {
                            proceso: estados.proceso || 0,
                            listo: estados.listo || 0,
                            completado: estados.completado || 0,
                            total: mesa.totalPedidos || 0  // Este total incluye TODOS (pendiente,proceso,listo,completado)
                        }
                    });
                    
                    totalProceso += estados.proceso || 0;
                    totalListo += estados.listo || 0;
                    totalCompletado += estados.completado || 0;
                });
                
                console.log('✅ Mesas activas procesadas:', mesasActivas);
                
                // Actualizar contadores
                actualizarContadores(totalProceso, totalListo, totalCompletado, mesasActivas.length);
                
                // Mostrar mesas activas
                mostrarMesasActivas(mesasActivas);
            }
        })
        .catch(error => {
            console.error('❌ Error cargando estados:', error);
            mostrarMensajeError();
        });
}

function actualizarContadores(procesoCount, listoCount, completadoCount, totalMesas) {
    const procesoElement = document.getElementById('total-pedidos-proceso');
    const listoElement = document.getElementById('total-pedidos-listo');
    const completadoElement = document.getElementById('total-pedidos-completado');
    const totalActivasElement = document.getElementById('total-mesas-activas');
    
    if (procesoElement) procesoElement.textContent = procesoCount;
    if (listoElement) listoElement.textContent = listoCount;
    if (completadoElement) completadoElement.textContent = completadoCount;
    if (totalActivasElement) totalActivasElement.textContent = totalMesas;
}

function mostrarMesasActivas(mesasActivas) {
    const container = document.getElementById('mesasActivasContainer');
    const sinPedidos = document.getElementById('sinPedidosActivos');
    
    if (!container) return;
    
    if (mesasActivas.length === 0) {
        if (sinPedidos) sinPedidos.style.display = 'block';
        container.innerHTML = '';
        container.appendChild(sinPedidos);
        return;
    }
    
    if (sinPedidos) sinPedidos.style.display = 'none';
    
    // Limpiar container
    container.innerHTML = '';
    
    // Ordenar por timestamp (más reciente primero)
    mesasActivas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    mesasActivas.forEach(mesa => {
        const horaPedido = mesa.timestamp ? new Date(mesa.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }) : 'N/A';
        
        // Crear card de mesa activa
        const card = document.createElement('div');
        card.className = 'mesa-activa-card';
        card.dataset.mesaId = mesa.mesaId;
        card.onclick = () => verDetallesMesa(mesa.mesaId);
        
        // Badge de estadísticas - proceso, listo y completado
        const statsBadge = `
            <div class="mesa-stats-badge">
                <span class="badge-proceso">🔄 ${mesa.stats.proceso}</span>
                <span class="badge-listo">✅ ${mesa.stats.listo}</span>
                <span class="badge-completado">✔️ ${mesa.stats.completado}</span>
            </div>
        `;
        
        card.innerHTML = `
            <div class="mesa-activa-header">
                <div class="mesa-id-grande">${mesa.id}</div>
                <div class="mesa-titulo-derecha">
                    <div class="mesa-nombre">${mesa.nombre}</div>
                </div>
                <div class="mesa-activa-hora">
                    <i class="far fa-clock"></i> ${horaPedido}
                </div>
            </div>
            <div class="mesa-activa-body">
                ${statsBadge}
            </div>
            <div class="mesa-activa-footer">
                <button class="btn-ver-pedidos" onclick="event.stopPropagation(); verDetallesMesa('${mesa.mesaId}')">
                    <i class="fas fa-eye"></i> Ver todos (${mesa.stats.total})
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function verDetallesMesa(mesaId) {
    console.log('Viendo detalles de mesa:', mesaId);
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarModalDetalle(data);
            } else {
                mostrarNotificacion('Error al cargar detalles', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarNotificacion('Error de conexión', 'error');
        });
}

function mostrarModalDetalle(data) {
    document.getElementById('modalMesaNombre').textContent = `Mesa ${data.numeroMesa}`;
    
    const modalContainer = document.getElementById('modalPedidosContainer');
    modalContainer.innerHTML = '';
    
    if (data.pedidos.length === 0) {
        modalContainer.innerHTML = '<div class="sin-pedidos"><i class="fas fa-info-circle"></i><p>No hay pedidos para esta mesa</p></div>';
    } else {
        // Ordenar pedidos: pendiente, proceso, listo, completado
        const orden = { 'pendiente': 1, 'proceso': 2, 'listo': 3, 'completado': 4 };
        const pedidosOrdenados = [...data.pedidos].sort((a, b) => 
            (orden[a.estado] || 5) - (orden[b.estado] || 5)
        );
        
        pedidosOrdenados.forEach(pedido => {
            const pedidoElement = document.createElement('div');
            pedidoElement.className = `modal-pedido-item estado-${pedido.estado}`;
            
            // Determinar el icono y texto según el estado
            let icono = '';
            let textoEstado = '';
            let colorEstado = '';
            
            switch(pedido.estado) {
                case 'proceso':
                    icono = 'fa-spinner fa-spin';
                    textoEstado = 'En Proceso';
                    colorEstado = '#f39c12';
                    break;
                case 'listo':
                    icono = 'fa-check-circle';
                    textoEstado = 'Listo para servir';
                    colorEstado = '#27ae60';
                    break;
                case 'pendiente':
                    icono = 'fa-clock';
                    textoEstado = 'Pendiente';
                    colorEstado = '#e74c3c';
                    break;
                case 'completado':
                    icono = 'fa-check-double';
                    textoEstado = 'Completado';
                    colorEstado = '#95a5a6';
                    break;
                default:
                    icono = 'fa-question-circle';
                    textoEstado = 'Desconocido';
                    colorEstado = '#95a5a6';
            }
            
            // Formatear la hora
            const horaPedido = pedido.hora ? new Date(pedido.hora).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : 'N/A';
            
            // Si está completado, mostrar también hora de completado
            const horaCompletadoHtml = pedido.horaCompletado ? `
                <span class="hora-pedido" style="margin-left: 10px;">
                    <i class="fas fa-check-circle"></i> ${new Date(pedido.horaCompletado).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}
                </span>
            ` : '';
            
            pedidoElement.innerHTML = `
                <div class="modal-pedido-header">
                    <span class="modal-pedido-nombre">${pedido.producto}</span>
                    <span class="modal-pedido-cantidad">${pedido.cantidad}</span>
                </div>
                ${pedido.nota ? `
                    <div class="modal-pedido-nota">
                        <i class="fas fa-sticky-note"></i> ${pedido.nota}
                    </div>
                ` : ''}
                <div class="modal-pedido-footer">
                    <span class="estado-badge ${pedido.estado}" style="background: ${colorEstado}; color: ${pedido.estado === 'proceso' ? '#000' : '#fff'}; padding: 3px 10px; border-radius: 15px;">
                        <i class="fas ${icono}"></i>
                        ${textoEstado}
                    </span>
                    <span class="hora-pedido">
                        <i class="far fa-clock"></i> ${horaPedido}
                    </span>
                    ${horaCompletadoHtml}
                </div>
            `;
            
            modalContainer.appendChild(pedidoElement);
        });
        
        // Agregar resumen
        const resumen = document.createElement('div');
        resumen.className = 'modal-total-pedidos';
        
        // Calcular estadísticas
        const pendientes = data.pedidos.filter(p => p.estado === 'pendiente').length;
        const procesos = data.pedidos.filter(p => p.estado === 'proceso').length;
        const listos = data.pedidos.filter(p => p.estado === 'listo').length;
        const completados = data.pedidos.filter(p => p.estado === 'completado' || p.completado === true).length;
        
        resumen.innerHTML = `
            <hr>
            <p style="text-align: center; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                <strong>Total: ${data.pedidos.length} pedidos</strong> 
                (Pendientes: ${pendientes} | 
                En Proceso: ${procesos} | 
                Listos: ${listos} | 
                Completados: ${completados})
            </p>
        `;
        modalContainer.appendChild(resumen);
    }
    
    // Mostrar modal
    document.getElementById('detalleMesaModal').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('detalleMesaModal').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('detalleMesaModal');
    if (event.target === modal) {
        cerrarModal();
    }
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

function mostrarMensajeError() {
    const container = document.getElementById('mesasActivasContainer');
    const sinPedidos = document.getElementById('sinPedidosActivos');
    
    if (container && sinPedidos) {
        sinPedidos.style.display = 'block';
        sinPedidos.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
            <h3>Error de conexión</h3>
            <p>No se pudieron cargar los pedidos. Verifica tu conexión.</p>
        `;
        container.innerHTML = '';
        container.appendChild(sinPedidos);
    }
}

// Agregar estilos para los badges
if (!document.querySelector('#badge-styles')) {
    const style = document.createElement('style');
    style.id = 'badge-styles';
    style.textContent = `
        .badge-pendiente {
            background: #e74c3c;
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .badge-proceso {
            background: #f39c12;
            color: #000;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .badge-listo {
            background: #27ae60;
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .badge-completado {
            background: #95a5a6;
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .mesa-stats-badge {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 10px 0;
            padding: 5px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(5px);
            flex-wrap: wrap;
        }
        
        .modal-pedido-item.estado-completado {
            border-left-color: #95a5a6;
            opacity: 0.8;
            background: #f8f9fa;
        }
        
        .modal-pedido-item.estado-completado .modal-pedido-nombre {
            text-decoration: line-through;
            text-decoration-color: #7f8c8d;
        }
        
        /* Responsive para badges */
        @media (max-width: 768px) {
            .mesa-stats-badge {
                gap: 5px;
            }
            .badge-proceso, .badge-listo, .badge-completado {
                padding: 2px 6px;
                font-size: 0.7em;
            }
        }
    `;
    document.head.appendChild(style);
}