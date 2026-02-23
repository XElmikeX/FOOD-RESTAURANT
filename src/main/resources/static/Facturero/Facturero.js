let intervaloActualizacion;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Facturero iniciado');
    
    // Cargar datos iniciales
    cargarResumenDiario();
    actualizarFacturasContainer(); // Cargar facturas iniciales
    
    // Actualizar datos cada 3 segundos SIN recargar la página
    intervaloActualizacion = setInterval(function() {
        console.log('🔄 Actualizando facturas automáticamente...');
        actualizarFacturasContainer(); // Solo actualiza el contenedor de facturas
        cargarResumenDiario(); // Actualizar resumen
    }, 3000);
    
    // Escuchar cambios en localStorage (para cuando se factura desde otra pestaña)
    window.addEventListener('storage', function(e) {
        if (e.key === 'estados_mesas_cocina') {
            console.log('🔄 Cambios detectados en localStorage, actualizando facturas...');
            actualizarFacturasContainer();
            cargarResumenDiario();
        }
    });
    
    // Escuchar evento personalizado de facturación
    window.addEventListener('mesaFacturada', function(e) {
        console.log('💰 Mesa facturada:', e.detail.mesaId);
        actualizarFacturasContainer();
        cargarResumenDiario();
    });
});

// Función específica para actualizar SOLO el facturas-container
function actualizarFacturasContainer() {
    console.log('📦 Actualizando contenedor de facturas...');
    
    fetch(window.location.href)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Obtener el nuevo facturas-container
            const nuevoFacturasContainer = doc.querySelector('.facturas-container');
            const actualFacturasContainer = document.querySelector('.facturas-container');
            
            if (nuevoFacturasContainer && actualFacturasContainer) {
                // Reemplazar solo el contenido del facturas-container
                actualFacturasContainer.innerHTML = nuevoFacturasContainer.innerHTML;
                console.log('✅ Facturas actualizadas correctamente');
                
                // Actualizar estadísticas después de actualizar facturas
                actualizarEstadisticasFacturas();
            } else {
                console.log('⚠️ No se encontró el contenedor de facturas');
            }
        })
        .catch(error => {
            console.error('❌ Error actualizando facturas:', error);
        });
}

// Función para actualizar solo las estadísticas de facturas
function actualizarEstadisticasFacturas() {
    // Actualizar total de mesas (primer stat-item)
    const totalMesasElement = document.querySelector('.stat-item .stat-value');
    if (totalMesasElement) {
        const mesasCount = document.querySelectorAll('.mesa-factura-card').length;
        totalMesasElement.textContent = mesasCount;
    }
    
    // Actualizar total de pedidos (segundo stat-item)
    const totalPedidosElement = document.querySelectorAll('.stat-item')[1]?.querySelector('.stat-value');
    if (totalPedidosElement) {
        let totalPedidos = 0;
        document.querySelectorAll('.pedido-factura-item').forEach(() => totalPedidos++);
        totalPedidosElement.textContent = totalPedidos;
    }
}

// Modificar eliminarPedidosMesa para actualizar después de facturar
function eliminarPedidosMesa(mesaId) {
    if (!confirm('¿Estás seguro de que deseas facturar estos pedidos?')) {
        return;
    }
    
    const boton = event.currentTarget;
    const textoOriginal = boton.innerHTML;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Facturando...';
    boton.disabled = true;
    
    fetch('/api/pedidos/eliminarYGuardar/' + mesaId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Eliminar la mesa del localStorage
            eliminarMesaDeLocalStorage(mesaId);
            
            mostrarNotificacion('✅ Pedidos facturados correctamente', 'success');
            
            // Actualizar inmediatamente
            setTimeout(() => {
                actualizarFacturasContainer();
                cargarResumenDiario();
            }, 500);
            
        } else {
            mostrarNotificacion('Error: ' + data.message, 'error');
            boton.innerHTML = textoOriginal;
            boton.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error al procesar la facturación', 'error');
        boton.innerHTML = textoOriginal;
        boton.disabled = false;
    });
}

// Pausar actualizaciones cuando la pestaña no está visible (opcional)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('⏸️ Pausando actualizaciones del facturero');
        clearInterval(intervaloActualizacion);
    } else {
        console.log('▶️ Reanudando actualizaciones del facturero');
        intervaloActualizacion = setInterval(function() {
            console.log('🔄 Actualizando facturas automáticamente...');
            actualizarFacturasContainer();
            cargarResumenDiario();
        }, 3000);
        // Actualizar inmediatamente al volver
        actualizarFacturasContainer();
        cargarResumenDiario();
    }
});

function verDetalleMesa(mesaId) {
    const mesaCard = document.getElementById('mesa-' + mesaId);

    const pedidosContainer = mesaCard.querySelector('.pedidos-list');
    pedidosContainer.classList.toggle('hidden');
            
    const botonDetalle = mesaCard.querySelector('.btn-ver-detalle');
    if (pedidosContainer.classList.contains('hidden')) {
        botonDetalle.innerHTML = '<i class="fas fa-eye"></i> Detalle';
    } else {
        botonDetalle.innerHTML = '<i class="fas fa-eye-slash"></i> Detalle';
    }

}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('facturaModal');
    if (event.target === modal) {
        cerrarModal();
    }
};

/*FACTURA DE LA BOLETA*/

function imprimirFactura() {
    // Obtener el botón que fue clickeado
    const boton = event.currentTarget;
    console.log('Botón clickeado:', boton);
    
    // Encontrar la tarjeta de mesa más cercana
    const mesaCard = boton.closest('.mesa-factura-card');
    console.log('Mesa card encontrada:', mesaCard);
    
    if (!mesaCard) {
        console.error('No se encontró la tarjeta de mesa');
        return;
    }
    
    // Extraer información de la mesa
    const mesaNumero = mesaCard.querySelector('.mesa-numero').textContent;
    const mesaTotal = mesaCard.querySelector('.total-valor').textContent;
    
    console.log('Mesa número:', mesaNumero);
    console.log('Mesa total:', mesaTotal);
    
    // Obtener todos los pedidos de esta mesa
    const pedidosItems = mesaCard.querySelectorAll('.pedido-factura-item');
    console.log('Pedidos encontrados:', pedidosItems.length);
    
    const pedidos = [];
    
    pedidosItems.forEach((item, index) => {
        const cantidad = item.querySelector('.pedido-cantidad').textContent.replace('x', '');
        const nombre = item.querySelector('.pedido-nombre').textContent;
        const precioTotal = item.querySelector('.pedido-precio').textContent;
        
        // Buscar nota si existe
        const notaElement = item.querySelector('.pedido-nota span');
        const nota = notaElement ? notaElement.textContent : '';
        
        console.log(`Pedido ${index + 1}:`, { cantidad, nombre, precioTotal, nota });
        
        pedidos.push({
            cantidad: cantidad,
            nombre: nombre,
            precioTotal: precioTotal,
            nota: nota
        });
    });
    
    // Crear la boleta
    crearYMostrarBoleta(mesaNumero, mesaTotal, pedidos);
}

function crearYMostrarBoleta(mesaNumero, mesaTotal, pedidos) {
    // Fecha y hora actual
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-ES');
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Número de factura aleatorio
    const facturaNumero = 'F' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Crear el HTML de la boleta (tal como lo tienes)
    const boletaHTML = `
        <div class="boleta-impresion">
            <div class="boleta-header">
                <h2>RESTAURANTE: XELMIKEX</h2>
                <p>Factura de Venta</p>
                <p>N° ${facturaNumero}</p>
            </div>
            
            <div class="boleta-info">
                <p><span>Mesa:</span> <strong>${mesaNumero}</strong></p>
                <p><span>Fecha:</span> ${fecha}</p>
                <p><span>Hora:</span> ${hora}</p>
            </div>
            
            <div class="boleta-items">
                <div class="boleta-items-header">
                    <span>PRODUCTO</span>
                    <span>CANT</span>
                    <span>TOTAL</span>
                </div>
                
                ${pedidos.map(p => `
                    <div class="boleta-item">
                        <span>${p.nombre}</span>
                        <span>x${p.cantidad}</span>
                        <span>${p.precioTotal}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="boleta-total">
                <span>TOTAL A PAGAR:</span>
                <span>${mesaTotal}</span>
            </div>
            
            <div class="boleta-footer">
                <p>¡Gracias por su visita!</p>
            </div>
        </div>
    `;
    
    // Crear un contenedor temporal para la boleta
    const contenedorTemp = document.createElement('div');
    contenedorTemp.id = 'contenedor-boleta-temporal';
    contenedorTemp.innerHTML = boletaHTML;
    document.body.appendChild(contenedorTemp);
    
    // Imprimir
    setTimeout(() => {
        window.print();
        
        // Eliminar el contenedor temporal después de imprimir
        setTimeout(() => {
            if (document.body.contains(contenedorTemp)) {
                document.body.removeChild(contenedorTemp);
                console.log('Contenedor de boleta eliminado');
            }
        }, 1000);
    }, 200);
}

/***************GUARDADO EN EL EXCEL*****************************/
function eliminarPedidosMesa(mesaId) {
    if (!confirm('¿Estás seguro de que deseas facturar estos pedidos?')) {
        return;
    }
    
    const boton = event.currentTarget;
    const textoOriginal = boton.innerHTML;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Facturando...';
    boton.disabled = true;
    
    fetch('/api/pedidos/eliminarYGuardar/' + mesaId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Eliminar la mesa del localStorage
            eliminarMesaDeLocalStorage(mesaId);
            
            mostrarNotificacion('✅ Pedidos facturados correctamente', 'success');
            
            // Eliminar la carta del DOM inmediatamente
            const mesaCard = document.getElementById('mesa-' + mesaId);
            if (mesaCard) {
                mesaCard.remove();
                console.log(`🗑️ Mesa ${mesaId} eliminada del DOM`);
            }
            
            // Actualizar resumen diario
            cargarResumenDiario();
            
            // Actualizar totales
            actualizarTotales();
            
            // Verificar si no quedan mesas
            const mesasRestantes = document.querySelectorAll('.mesa-factura-card');
            if (mesasRestantes.length === 0) {
                console.log('📭 No quedan mesas, mostrando mensaje');
                const container = document.querySelector('.facturas-container');
                if (container) {
                    container.innerHTML = `
                        <div class="sin-facturas">
                            <i class="fas fa-check-circle"></i>
                            <h3>No hay pedidos listos para facturar</h3>
                            <p>Los pedidos aparecerán aquí cuando el cocinero los complete</p>
                        </div>
                    `;
                }
            }
            
            // Forzar una actualización después de facturar
            setTimeout(() => {
                actualizarTodo();
            }, 500);
            
        } else {
            mostrarNotificacion('Error: ' + data.message, 'error');
            boton.innerHTML = textoOriginal;
            boton.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error al procesar la facturación', 'error');
        boton.innerHTML = textoOriginal;
        boton.disabled = false;
    });
}

function eliminarMesaDeLocalStorage(mesaId) {
    const STORAGE_KEY = 'estados_mesas_cocina';
    let estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    console.log('Eliminando mesa del localStorage:', mesaId);
    
    // Eliminar la mesa del localStorage
    if (estadosGuardados[mesaId]) {
        delete estadosGuardados[mesaId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
        console.log('Mesa eliminada del localStorage');
        
        // Disparar un evento personalizado para notificar a otras pestañas
        window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify(estadosGuardados)
        }));
        
        // También podemos disparar un evento personalizado
        window.dispatchEvent(new CustomEvent('mesaFacturada', {
            detail: { mesaId: mesaId }
        }));
    }
}

function cargarResumenDiario() {
    console.log('📊 Cargando resumen diario...');
    
    fetch('/api/pedidos/resumen-diario')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta');
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 Datos recibidos:', data);
            
            const container = document.getElementById('resumen-diario-container');
            if (!container) return;
            
            if (data.dias && data.dias.length > 0) {
                mostrarResumenDiario(data.dias);
            } else {
                mostrarMensajeSinDatos();
            }
        })
        .catch(error => {
            console.error('❌ Error cargando resumen:', error);
            mostrarErrorResumen();
        });
}

function mostrarMensajeSinDatos() {
    console.log('📭 No hay datos, mostrando mensaje');
    
    const container = document.getElementById('resumen-diario-container');
    if (!container) return;
    
    // Limpiar el contenedor
    container.innerHTML = '';
    container.style.display = 'block';
    
    // Crear estructura para mensaje sin datos
    const resumenDiv = document.createElement('div');
    resumenDiv.className = 'resumen-diario';
    
    const header = document.createElement('div');
    header.className = 'resumen-header';
    header.innerHTML = `
        <h3><i class="fas fa-chart-line"></i> Resumen de Ganancias por Día</h3>
        <button class="refresh-resumen" onclick="cargarResumenDiario()">
            <i class="fas fa-sync-alt"></i>
        </button>
    `;
    
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = 'sin-datos-mensaje';
    mensajeDiv.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <p>No hay datos disponibles. Factura algunos pedidos para ver el resumen.</p>
    `;
    
    resumenDiv.appendChild(header);
    resumenDiv.appendChild(mensajeDiv);
    container.appendChild(resumenDiv);
}

function mostrarErrorResumen() {
    console.log('❌ Mostrando error');
    
    const container = document.getElementById('resumen-diario-container');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.display = 'block';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'resumen-diario error';
    errorDiv.innerHTML = `
        <div class="resumen-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Error al cargar</h3>
            <button class="refresh-resumen" onclick="cargarResumenDiario()">
                <i class="fas fa-sync-alt"></i> Reintentar
            </button>
        </div>
    `;
    
    container.appendChild(errorDiv);
}

function mostrarResumenDiario(dias) {
    console.log('🎨 Mostrando resumen con', dias.length, 'días');
    
    const container = document.getElementById('resumen-diario-container');
    if (!container) {
        console.error('❌ No se encontró el contenedor resumen-diario-container');
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    container.style.display = 'block';
    
    // Crear estructura
    const resumenDiv = document.createElement('div');
    resumenDiv.className = 'resumen-diario';
    
    // Header
    const header = document.createElement('div');
    header.className = 'resumen-header';
    header.innerHTML = `
        <h3><i class="fas fa-chart-line"></i> Resumen de Ganancias por Día</h3>
        <button class="refresh-resumen" onclick="cargarResumenDiario()">
            <i class="fas fa-sync-alt"></i>
        </button>
    `;
    
    // Grid de tarjetas
    const grid = document.createElement('div');
    grid.className = 'resumen-grid';
    
    // Ordenar días de más reciente a más antiguo
    dias.sort((a, b) => {
        const fechaA = a.fecha.split('-').reverse().join('-');
        const fechaB = b.fecha.split('-').reverse().join('-');
        return fechaB.localeCompare(fechaA);
    });
    
    // Generar tarjetas
    dias.forEach(dia => {
        const [diaStr, mesStr, anioStr] = dia.fecha.split('-');
        const fechaFormateada = `${diaStr}/${mesStr}/${anioStr}`;
        
        const card = document.createElement('div');
        card.className = 'resumen-card';
        card.onclick = () => verDetalleDia(dia.fecha);
        card.innerHTML = `
            <div class="resumen-fecha">${fechaFormateada}</div>
            <div class="resumen-ganancias">$${dia.totalGanancias.toFixed(2)}</div>
            <div class="resumen-pedidos">${dia.cantidadPedidos} productos</div>
        `;
        grid.appendChild(card);
    });
    
    resumenDiv.appendChild(header);
    resumenDiv.appendChild(grid);
    container.appendChild(resumenDiv);
    
    console.log('✅ Resumen mostrado correctamente');
}

function actualizarTotales() {
    const totalVentasElement = document.querySelector('.stat-item:last-child .stat-value');
    if (totalVentasElement) {
        let total = 0;
        document.querySelectorAll('.mesa-factura-card .total-valor').forEach(el => {
            const valor = parseFloat(el.textContent.replace('$', '').replace(',', ''));
            if (!isNaN(valor)) total += valor;
        });
        totalVentasElement.textContent = '$' + total.toFixed(2);
    }
}

function mostrarNotificacion(mensaje, tipo) {
    const notificacionesPrevias = document.querySelectorAll('.notificacion');
    notificacionesPrevias.forEach(n => n.remove());
    
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = mensaje;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.classList.add('mostrar');
    }, 10);
    
    setTimeout(() => {
        notificacion.classList.remove('mostrar');
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

function verDetalleDia(fecha) {
    const fechaFormateada = fecha.split('-').reverse().join('/');
    mostrarNotificacion(`📊 Ver detalles del ${fechaFormateada}`, 'info');
}

// Inicializar cuando la página carga
document.addEventListener('DOMContentLoaded', function() {
    cargarResumenDiario();
});