const STORAGE_KEY = 'estados_mesas_cocina';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Mozo.js cargado');
    
    // Cargar estados iniciales
    cargarEstadosPedidos();
    
    // Escuchar cambios en localStorage (para actualizar cuando Facturero elimine datos)
    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
            console.log('Cambios detectados en localStorage, actualizando...');
            cargarEstadosPedidos();
        }
    });
    
    // Escuchar evento personalizado de facturación
    window.addEventListener('mesaFacturada', function(e) {
        console.log('Mesa facturada:', e.detail.mesaId);
        cargarEstadosPedidos();
    });
    
    // Actualizar cada 3 segundos como respaldo
    setInterval(cargarEstadosPedidos, 3000);
});

function cargarEstadosPedidos() {
    console.log('Cargando estados de pedidos...');
    
    // Obtener estados guardados
    const estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    console.log('📦 Datos en localStorage:', estadosGuardados);
    
    // Organizar mesas con pedidos
    const mesasActivas = [];
    let totalProceso = 0;
    let totalListo = 0;
    
    // Procesar cada mesa
    Object.keys(estadosGuardados).forEach(key => {
        const mesaData = estadosGuardados[key];
        
        // ✅ CAMBIO IMPORTANTE: Procesar SIEMPRE que tenga pedidos, sin importar el estado
        if (mesaData.pedidos && mesaData.pedidos.length > 0) {
            
            // Contar pedidos por estado
            const pedidosProceso = mesaData.pedidos.filter(p => p.estado === 'proceso').length;
            const pedidosListo = mesaData.pedidos.filter(p => p.estado === 'listo').length;
            
            totalProceso += pedidosProceso;
            totalListo += pedidosListo;
            
            // ✅ Agregar la mesa SIEMPRE (aunque todos los pedidos estén pendientes)
            mesasActivas.push({
                mesaId: key,
                id: mesaData.id || key,
                nombre: mesaData.nombre || 'Mesa',
                timestamp: mesaData.timestamp,
                pedidos: mesaData.pedidos, // Aquí están TODOS los 4 pedidos
                stats: {
                    proceso: pedidosProceso,
                    listo: pedidosListo,
                    total: mesaData.pedidos.length // Total correcto: 4
                }
            });
        } else {
            // Si no tiene pedidos, eliminar del localStorage
            delete estadosGuardados[key];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
        }
    });
    
    console.log('✅ Mesas activas procesadas:', mesasActivas);
    
    // Actualizar contadores
    actualizarContadores(totalProceso, totalListo, mesasActivas.length);
    
    // Mostrar mesas activas (TU FUNCIÓN ORIGINAL SIN CAMBIOS)
    mostrarMesasActivas(mesasActivas);
    
    // Actualizar indicadores en las mesas
    actualizarIndicadoresMesas(estadosGuardados);
}

function actualizarContadores(procesoCount, listoCount, totalMesas) {
    const procesoElement = document.getElementById('total-pedidos-proceso');
    const listoElement = document.getElementById('total-pedidos-listo');
    const totalActivasElement = document.getElementById('total-mesas-activas');
    
    if (procesoElement) procesoElement.textContent = procesoCount;
    if (listoElement) listoElement.textContent = listoCount;
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
    
    // Mostrar cada mesa activa
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
        
        // Badge de estadísticas
        const statsBadge = `
            <div class="mesa-stats-badge">
                <span class="badge-proceso">🔄 ${mesa.stats.proceso}</span>
                <span class="badge-listo">✅ ${mesa.stats.listo}</span>
            </div>
        `;
        
        card.innerHTML = `
            <div class="mesa-activa-header">
                <div class="mesa-id-grande">${mesa.id}</div>
                <div class="mesa-titulo-derecha">
                    <div class="mesa-nombre">${mesa.nombre}</div>
                </div>
                <div class="mesa-activa-hora">
                    ${horaPedido}
                </div>
            </div>
            <div class="mesa-activa-body">
                ${statsBadge}
            </div>
            <div class="mesa-activa-footer">
                <button class="btn-ver-pedidos" onclick="event.stopPropagation(); verDetallesMesa('${mesa.mesaId}')">
                    <i class="fas fa-eye"></i> Ver todos (${mesa.pedidos.length})
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function actualizarIndicadoresMesas(estadosGuardados) {
    // Actualizar indicadores en las cards de las mesas
    document.querySelectorAll('.card').forEach(card => {
        const mesaId = card.dataset.mesaId;
        let indicador = card.querySelector('.estado-indicador');
        
        if (!indicador) {
            indicador = document.createElement('div');
            indicador.className = 'estado-indicador';
            card.appendChild(indicador);
        }
        
        if (estadosGuardados[mesaId] && estadosGuardados[mesaId].pedidos) {
            const pedidos = estadosGuardados[mesaId].pedidos;
            const tieneListo = pedidos.some(p => p.estado === 'listo');
            const tieneProceso = pedidos.some(p => p.estado === 'proceso');
            
            if (tieneListo) {
                indicador.className = 'estado-indicador estado-listo';
                indicador.innerHTML = '<i class="fas fa-check-circle"></i> Hay listos';
            } else if (tieneProceso) {
                indicador.className = 'estado-indicador estado-proceso';
                indicador.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En proceso';
            }else {
                indicador.innerHTML = '';
                indicador.className = 'estado-indicador';
            }
        } else {
            indicador.innerHTML = '';
            indicador.className = 'estado-indicador';
        }
    });
}

function verDetallesMesa(mesaId) {
    console.log('Viendo detalles de mesa:', mesaId);
    
    const estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const mesaData = estadosGuardados[mesaId];
    
    if (!mesaData) {
        mostrarNotificacion('No hay datos para esta mesa', 'error');
        return;
    }
    
    const mesaNumero = mesaData.nombre || mesaId;
    
    // Actualizar modal
    document.getElementById('modalMesaNombre').textContent = `Mesa ${mesaNumero}`;
    
    const modalContainer = document.getElementById('modalPedidosContainer');
    modalContainer.innerHTML = '';
    
    if (mesaData.pedidos.length === 0) {
        modalContainer.innerHTML = '<div class="sin-pedidos"><i class="fas fa-info-circle"></i><p>No hay pedidos para esta mesa</p></div>';
    } else {
        // Ordenar pedidos: pendiente primero, luego proceso, luego listo
        const pedidosOrdenados = [...mesaData.pedidos].sort((a, b) => {
            const orden = { 'pendiente': 1, 'proceso': 2, 'listo': 3 };
            return (orden[a.estado] || 4) - (orden[b.estado] || 4);
        });
        
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
                default:
                    icono = 'fa-question-circle';
                    textoEstado = 'Desconocido';
                    colorEstado = '#95a5a6';
            }
            
            // Formatear la hora
            const horaPedido = pedido.timestamp ? new Date(pedido.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : 'N/A';
            
            pedidoElement.innerHTML = `
                <div class="modal-pedido-header">
                    <span class="modal-pedido-nombre">${pedido.producto || 'Producto'}</span>
                    <span class="modal-pedido-cantidad">${pedido.cantidad || 'x1'}</span>
                </div>
                ${pedido.nota ? `
                    <div class="modal-pedido-nota">
                        <i class="fas fa-sticky-note"></i> ${pedido.nota}
                    </div>
                ` : ''}
                <div class="modal-pedido-footer">
                    <span class="estado-badge ${pedido.estado}" style="background: ${colorEstado}; color: ${pedido.estado === 'proceso' ? '#000' : '#fff'};">
                        <i class="fas ${icono}"></i>
                        ${textoEstado}
                    </span>
                    <span class="hora-pedido">
                        <i class="far fa-clock"></i> ${horaPedido}
                    </span>
                </div>
            `;
            
            modalContainer.appendChild(pedidoElement);
        });
        
        // Agregar contador de total de pedidos
        const totalPedidos = document.createElement('div');
        totalPedidos.className = 'modal-total-pedidos';
        totalPedidos.innerHTML = `
            <hr>
            <p style="text-align: center; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                <strong>Total de pedidos: ${mesaData.pedidos.length}</strong> 
                (Pendientes: ${mesaData.pedidos.filter(p => p.estado === 'pendiente').length} | 
                En Proceso: ${mesaData.pedidos.filter(p => p.estado === 'proceso').length} | 
                Listos: ${mesaData.pedidos.filter(p => p.estado === 'listo').length})
            </p>
        `;
        modalContainer.appendChild(totalPedidos);
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
        ${tipo === 'success' ? 'background: linear-gradient(135deg, #27ae60, #2ecc71);' : 
          tipo === 'error' ? 'background: linear-gradient(135deg, #e74c3c, #c0392b);' : 
          'background: linear-gradient(135deg, #3498db, #2980b9);'}
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}