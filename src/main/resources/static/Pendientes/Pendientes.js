const STORAGE_KEY = 'estados_mesas_cocina';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Pendientes.js cargado');
    
    // Pequeño retraso para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        // Cargar estados guardados para esta mesa
        cargarEstadoInicial();
    }, 100);
    
    // Agregar evento a todos los botones de estado
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Encontrar la tarjeta padre
            const card = this.closest('.pedido-card');
            const header = card.querySelector(".card-header");
            const confir = card.querySelector(".confirmacion-container");
            const pedidoId = card.dataset.pedidoId;
            const mesaId = obtenerMesaId();
            const mesaIdNumerico = obtenerMesaIdNumerico(); // Nueva función
            const mesaNombre = obtenerMesaNombre(); // Nueva función
            const nombreProducto = card.querySelector('.nombre-plato')?.textContent || 'Producto';
            const cantidad = card.querySelector('.card-cantidad')?.textContent || 'x1';
            const nota = card.querySelector('.texto-nota')?.textContent || '';
            
            // Remover la clase 'activo' de todos los botones en esta tarjeta
            const allButtons = card.querySelectorAll('.btn-estado');
            allButtons.forEach(button => {
                button.classList.remove('activo');
            });
            
            // Agregar la clase 'activo' solo al botón clickeado
            this.classList.add('activo');
            
            // Actualizar la clase de la tarjeta según el estado seleccionado
            card.classList.remove('pendiente', 'proceso', 'listo');
            header.classList.remove('pend', 'proce', 'list');
            confir.classList.remove('aparicion');
            
            let nuevoEstado = '';
            
            if (this.classList.contains('btn-pendiente')) {
                card.classList.add('pendiente');
                header.classList.add('pend');
                nuevoEstado = 'pendiente';
            } else if (this.classList.contains('btn-proceso')) {
                card.classList.add('proceso');
                header.classList.add('proce');
                nuevoEstado = 'proceso';
            } else if (this.classList.contains('btn-listo')) {
                card.classList.add('listo');
                header.classList.add('list');
                confir.classList.add('aparicion');
                nuevoEstado = 'listo';
            }
            
            // Guardar estado en localStorage
            if (nuevoEstado) {
                guardarEstadoPedido(mesaIdNumerico, {
                    pedidoId: pedidoId,
                    estado: nuevoEstado,
                    numero: mesaIdNumerico,
                    nombre: mesaNombre,
                    producto: nombreProducto,
                    cantidad: cantidad,
                    nota: nota,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});

// Nueva función para obtener el ID numérico de la mesa
function obtenerMesaIdNumerico() {
    // Intentar obtener del elemento específico
    const mesaIdElement = document.querySelector('.mesaEscojida .mesa-numero');
    if (mesaIdElement) {
        return mesaIdElement.textContent.replace('Mesa: ', '').trim();
    }
    
    // Fallback: obtener de la URL
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (!isNaN(lastPart)) {
        return lastPart;
    }
    
    return null;
}

// Nueva función para obtener el nombre de la mesa
function obtenerMesaNombre() {
    const mesaNombreElement = document.querySelector('.mesa-numero:first-child');
    if (mesaNombreElement) {
        return mesaNombreElement.textContent.trim();
    }
    return 'Mesa';
}

function obtenerMesaId() {
    // Mantener por compatibilidad, pero usar obtenerMesaIdNumerico para el ID real
    return obtenerMesaIdNumerico();
}

function obtenerMesaNumero() {
    return obtenerMesaNombre();
}

function guardarEstadoPedido(mesaId, pedidoInfo) {
    if (!mesaId) {
        console.error('No se pudo obtener el ID de la mesa');
        return;
    }
    
    let estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    console.log('Guardando - ID numérico:', mesaId, 'Nombre:', pedidoInfo.nombre);
    console.log('Estado actual antes de guardar:', estadosGuardados);
    
    // USAR EL ID NUMÉRICO COMO CLAVE PRINCIPAL
    const key = mesaId; // Esto será "4", "6", "9", etc.
    
    // Si la mesa NO existe, crearla con TODOS los pedidos
    if (!estadosGuardados[key]) {
        // Aquí necesitamos obtener TODOS los pedidos de la mesa, no solo el que se está actualizando
        // Esto es un problema porque solo tenemos la información del pedido actual
        
        // Solución temporal: crear un array con este pedido
        estadosGuardados[key] = {
            pedidos: [],
            timestamp: new Date().toISOString(),
            id: mesaId,
            nombre: pedidoInfo.nombre,
        };
    }
    
    // Actualizar timestamp
    estadosGuardados[key].timestamp = new Date().toISOString();
    estadosGuardados[key].nombre = pedidoInfo.nombre;
    
    // Buscar si el pedido ya existe en el array
    const pedidoExistente = estadosGuardados[key].pedidos.findIndex(
        p => p.pedidoId === pedidoInfo.pedidoId
    );
    
    if (pedidoExistente !== -1) {
        // Actualizar pedido existente (cambiar su estado)
        estadosGuardados[key].pedidos[pedidoExistente] = {
            ...estadosGuardados[key].pedidos[pedidoExistente],
            ...pedidoInfo
        };
        console.log(`✅ Pedido ${pedidoInfo.pedidoId} actualizado a estado: ${pedidoInfo.estado}`);
    } else {
        // Agregar nuevo pedido
        estadosGuardados[key].pedidos.push(pedidoInfo);
        console.log(`➕ Nuevo pedido ${pedidoInfo.pedidoId} agregado con estado: ${pedidoInfo.estado}`);
    }
    
    // IMPORTANTE: Verificar que se conservaron TODOS los pedidos
    console.log(`📦 Mesa ${key} tiene ${estadosGuardados[key].pedidos.length} pedidos totales`);
    console.log('✅ Estado guardado correctamente:', estadosGuardados);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
}

function cargarEstadoInicial() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) {
        console.warn('No se pudo obtener el ID de la mesa para cargar estados');
        return;
    }
    
    console.log('Cargando estado inicial para mesa ID:', mesaId);
    
    const estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    console.log('Estados guardados en localStorage:', estadosGuardados);
    
    // Buscar la mesa por ID
    let mesaData = estadosGuardados[mesaId];
    
    if (mesaData && mesaData.pedidos && mesaData.pedidos.length > 0) {
        console.log('✅ Mesa encontrada con', mesaData.pedidos.length, 'pedidos');
        
        // Obtener TODOS los pedidos de la página actual
        const todosLosPedidos = document.querySelectorAll('.pedido-card');
        console.log(`📋 Hay ${todosLosPedidos.length} pedidos en la página`);
        
        // Primero, restaurar los estados guardados
        mesaData.pedidos.forEach(pedidoGuardado => {
            const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoGuardado.pedidoId}"]`);
            if (pedidoCard) {
                const header = pedidoCard.querySelector(".card-header");
                const confir = pedidoCard.querySelector(".confirmacion-container");
                
                console.log(`🎨 Aplicando estado ${pedidoGuardado.estado} al pedido ${pedidoGuardado.pedidoId}`);
                
                // Remover clases actuales
                pedidoCard.classList.remove('pendiente', 'proceso', 'listo');
                header.classList.remove('pend', 'proce', 'list');
                confir.classList.remove('aparicion');
                
                // Aplicar estado guardado
                pedidoCard.classList.add(pedidoGuardado.estado);
                
                if (pedidoGuardado.estado === 'pendiente') {
                    header.classList.add('pend');
                } else if (pedidoGuardado.estado === 'proceso') {
                    header.classList.add('proce');
                } else if (pedidoGuardado.estado === 'listo') {
                    header.classList.add('list');
                    confir.classList.add('aparicion');
                }
                
                // Activar botón correspondiente
                const botones = pedidoCard.querySelectorAll('.btn-estado');
                botones.forEach(btn => {
                    btn.classList.remove('activo');
                    if (btn.classList.contains(`btn-${pedidoGuardado.estado}`)) {
                        btn.classList.add('activo');
                    }
                });
            }
        });
        
        // AHORA: Asegurarse de que los pedidos que NO están en localStorage pero SÍ en la página
        // se agreguen a localStorage (para que Mozo los vea)
        todosLosPedidos.forEach(pedidoCard => {
            const pedidoId = pedidoCard.dataset.pedidoId;
            const existeEnStorage = mesaData.pedidos.some(p => p.pedidoId === pedidoId);
            
            if (!existeEnStorage) {
                console.log(`➕ Agregando pedido ${pedidoId} que no estaba en localStorage`);
                
                // Extraer información del pedido
                const nombreProducto = pedidoCard.querySelector('.nombre-plato')?.textContent || 'Producto';
                const cantidad = pedidoCard.querySelector('.card-cantidad')?.textContent || 'x1';
                const nota = pedidoCard.querySelector('.texto-nota')?.textContent || '';
                const mesaNombre = obtenerMesaNombre();
                
                // Determinar estado actual (por defecto pendiente)
                let estadoActual = 'pendiente';
                if (pedidoCard.classList.contains('proceso')) {
                    estadoActual = 'proceso';
                } else if (pedidoCard.classList.contains('listo')) {
                    estadoActual = 'listo';
                }
                
                // Crear nuevo pedido en localStorage
                const nuevoPedido = {
                    pedidoId: pedidoId,
                    estado: estadoActual,
                    numero: mesaId,
                    nombre: mesaNombre,
                    producto: nombreProducto,
                    cantidad: cantidad,
                    nota: nota,
                    timestamp: new Date().toISOString()
                };
                
                // Agregar a mesaData
                mesaData.pedidos.push(nuevoPedido);
            }
        });
        
        // Actualizar timestamp
        mesaData.timestamp = new Date().toISOString();
        
        // Guardar cambios
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
        console.log('✅ localStorage actualizado con todos los pedidos');
        
    } else {
        console.log('ℹ️ No hay estados guardados para esta mesa, guardando todos los pedidos como pendientes');
        
        // Si no hay datos, guardar TODOS los pedidos como pendientes
        const todosLosPedidos = document.querySelectorAll('.pedido-card');
        const mesaNombre = obtenerMesaNombre();
        const nuevosPedidos = [];
        
        todosLosPedidos.forEach(pedidoCard => {
            const pedidoId = pedidoCard.dataset.pedidoId;
            const nombreProducto = pedidoCard.querySelector('.nombre-plato')?.textContent || 'Producto';
            const cantidad = pedidoCard.querySelector('.card-cantidad')?.textContent || 'x1';
            const nota = pedidoCard.querySelector('.texto-nota')?.textContent || '';
            
            nuevosPedidos.push({
                pedidoId: pedidoId,
                estado: 'pendiente',
                numero: mesaId,
                nombre: mesaNombre,
                producto: nombreProducto,
                cantidad: cantidad,
                nota: nota,
                timestamp: new Date().toISOString()
            });
        });
        
        if (nuevosPedidos.length > 0) {
            estadosGuardados[mesaId] = {
                pedidos: nuevosPedidos,
                timestamp: new Date().toISOString(),
                id: mesaId,
                nombre: mesaNombre
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
            console.log(`✅ Guardados ${nuevosPedidos.length} pedidos en localStorage`);
        }
    }
}

// Función para limpiar datos antiguos (opcional)
function limpiarDatosAntiguos() {
    const estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const nuevoFormato = {};
    
    Object.entries(estadosGuardados).forEach(([key, value]) => {
        // Si la clave es un número o el valor tiene estructura correcta
        if (!isNaN(key) && value.pedidos) {
            nuevoFormato[key] = value;
        } else if (value.pedidos) {
            // Si tiene pedidos pero la clave no es numérica, intentar obtener el ID
            const idNumerico = value.id || key;
            nuevoFormato[idNumerico] = value;
        }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoFormato));
    console.log('Datos limpiados:', nuevoFormato);
}
