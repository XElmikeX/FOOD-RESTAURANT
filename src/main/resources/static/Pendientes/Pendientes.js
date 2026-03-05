// Variables para control de concurrencia

(function() {
    // Verificar si hay una recarga pendiente en sessionStorage
    const pendiente = sessionStorage.getItem('pedido_completado_urgente');
    if (pendiente) {
        console.log('🔄 Recarga pendiente detectada, ejecutando...');
        sessionStorage.removeItem('pedido_completado_urgente');
        
        // Mostrar mensaje y recargar
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(231, 76, 60, 0.9);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            flex-direction: column;
        `;
        overlay.innerHTML = '🔄 Sincronizando con otro dispositivo...<br><small>Recargando página</small>';
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            location.reload();
        }, 500);
    }
})();

let peticionesPendientes = new Map();

document.addEventListener('DOMContentLoaded', function() {
    console.log('Pendientes.js cargado - Con UI inmediata y polling');
    
    // Cargar estados iniciales
    cargarEstadosIniciales();
    
    // POLLING: Actualizar cada 3 segundos (para que otros dispositivos vean cambios)
    setInterval(() => {
        console.log('🔄 Actualizando estados desde servidor (polling)...');
        cargarEstadosIniciales();
    }, 3000);
    
    // Agregar evento a todos los botones de estado
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const card = this.closest('.pedido-card');
            const pedidoId = card.dataset.pedidoId;
            
            // Verificar si hay peticiones en curso
            if (peticionesPendientes.has(pedidoId)) {
                console.log(`⏳ Ya hay una petición para pedido ${pedidoId}`);
                mostrarNotificacion('Procesando...', 'info');
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
            
            // 🔥 ACTUALIZACIÓN INMEDIATA EN DISPOSITIVO 1
            aplicarEstadoUI(card, nuevoEstado);
            
            // Si es "listo", mostrar el botón de confirmación INMEDIATAMENTE
            const confir = card.querySelector(".confirmacion-container");
            if (nuevoEstado === 'listo') {
                confir.classList.add('aparicion');
                confir.style.animation = 'fadeIn 0.3s ease';
            } else {
                confir.classList.remove('aparicion');
            }
            
            // Feedback visual inmediato
            mostrarFeedbackVisual(card, nuevoEstado);
            
            // Actualizar estado en la BD (en segundo plano)
            actualizarEstadoPedido(pedidoId, nuevoEstado, card);
        });
    });
});

// 🔥 Feedback visual inmediato
function mostrarFeedbackVisual(card, nuevoEstado) {
    card.style.transition = 'all 0.2s ease';
    card.style.transform = 'scale(1.02)';
    card.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
    
    setTimeout(() => {
        card.style.transform = 'scale(1)';
    }, 200);
    
    // Mensaje flotante
    const mensaje = document.createElement('div');
    mensaje.className = 'feedback-flotante';
    mensaje.textContent = nuevoEstado === 'listo' ? '✓ Listo' : 
                         nuevoEstado === 'proceso' ? '⚙ Proceso' : '⏱ Pendiente';
    mensaje.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: ${nuevoEstado === 'listo' ? '#27ae60' : nuevoEstado === 'proceso' ? '#f39c12' : '#e74c3c'};
        color: white;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.8em;
        font-weight: bold;
        z-index: 10;
        animation: fadeInOut 2s ease forwards;
    `;
    
    card.style.position = 'relative';
    card.appendChild(mensaje);
    
    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.remove();
        }
    }, 2000);
}

// 🔥 Aplicar cambios visuales inmediatos
function aplicarEstadoUI(card, estado) {
    if (!card || !document.body.contains(card)) return;
    
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

// 🔥 MODIFICADO: Ahora aplica estados pero respeta cambios recientes
function cargarEstadosIniciales() {
    const mesaId = obtenerMesaIdNumerico();
    if (!mesaId) return;
    
    fetch(`/api/pedidos/estados-mesa/${mesaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('📦 Estados desde servidor:', data.pedidos.length);
                
                data.pedidos.forEach(pedidoInfo => {
                    const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoInfo.id}"]`);
                    if (pedidoCard) {
                        // 🔥 IMPORTANTE: Verificar si hubo interacción reciente
                        const ultimaInteraccion = pedidoCard.dataset.ultimaInteraccion;
                        const ahora = Date.now();
                        
                        // Si no hubo interacción en los últimos 2 segundos, aplicar estado
                        if (!ultimaInteraccion || (ahora - parseInt(ultimaInteraccion)) > 2000) {
                            console.log(`📋 Aplicando estado ${pedidoInfo.estado} a pedido ${pedidoInfo.id}`);
                            aplicarEstadoUI(pedidoCard, pedidoInfo.estado);
                            
                            // Actualizar botón de confirmación según estado
                            const confir = pedidoCard.querySelector(".confirmacion-container");
                            if (pedidoInfo.estado === 'listo') {
                                confir.classList.add('aparicion');
                            } else {
                                confir.classList.remove('aparicion');
                            }
                        } else {
                            console.log(`⏭️ Ignorando actualización para pedido ${pedidoInfo.id} - interacción reciente`);
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error cargando estados:', error));
}

function actualizarEstadoPedido(pedidoId, nuevoEstado, card) {
    // Marcar petición en curso
    peticionesPendientes.set(pedidoId, true);
    
    // 🔥 Marcar momento de interacción para evitar sobrescritura
    if (card) {
        card.dataset.ultimaInteraccion = Date.now().toString();
    }
    
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
            console.log('✅ Estado confirmado en servidor:', data);
            
            // 🔥 IMPORTANTE: Guardar en localStorage para sincronización básica
            guardarEstadoEnStorage(pedidoId, nuevoEstado, data.mesaId);
            
            // Disparar evento para actualizar el MOZO (solo en esta pestaña)
            window.dispatchEvent(new CustomEvent('pedidoActualizado', { 
                detail: { 
                    mesaId: data.mesaId,
                    pedidoId: pedidoId,
                    nuevoEstado: nuevoEstado
                }
            }));
            
        } else {
            console.error('❌ Error en servidor');
            mostrarNotificacion('❌ Error al actualizar', 'error');
            // Revertir UI (opcional)
            setTimeout(() => cargarEstadosIniciales(), 1000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error de conexión', 'error');
    })
    .finally(() => {
        peticionesPendientes.delete(pedidoId);
    });
}

// 🔥 NUEVO: Guardar en localStorage para sincronización entre pestañas
function guardarEstadoEnStorage(pedidoId, estado, mesaId) {
    const STORAGE_KEY = 'ultimos_estados';
    let estados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    estados[pedidoId] = {
        estado: estado,
        mesaId: mesaId,
        timestamp: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estados));
    
    // Disparar evento para otras pestañas de esta misma mesa
    localStorage.setItem('ultimo_cambio', JSON.stringify({
        pedidoId: pedidoId,
        estado: estado,
        mesaId: mesaId,
        timestamp: Date.now()
    }));
    
    // Limpiar después de 2 segundos
    setTimeout(() => {
        localStorage.removeItem('ultimo_cambio');
    }, 2000);
}

function obtenerMesaIdNumerico() {
    const mesaIdElement = document.querySelector('.mesaEscojida .mesa-numero');
    if (mesaIdElement) {
        return mesaIdElement.textContent.replace('Mesa: ', '').trim();
    }
    return null;
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

// 🔥 NUEVO: Escuchar cambios de localStorage (para otras pestañas)
window.addEventListener('storage', function(e) {
    if (e.key === 'ultimo_cambio' && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            console.log('📡 Cambio detectado en otra pestaña:', data);
            
            // Solo procesar si es de la misma mesa que estamos viendo
            const mesaActual = obtenerMesaIdNumerico();
            if (mesaActual && data.mesaId == mesaActual) {
                const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${data.pedidoId}"]`);
                if (pedidoCard) {
                    // Verificar que no haya interacción reciente
                    const ultimaInteraccion = pedidoCard.dataset.ultimaInteraccion;
                    const ahora = Date.now();
                    
                    if (!ultimaInteraccion || (ahora - parseInt(ultimaInteraccion)) > 2000) {
                        console.log(`🔄 Aplicando cambio desde otra pestaña: ${data.estado}`);
                        aplicarEstadoUI(pedidoCard, data.estado);
                        
                        const confir = pedidoCard.querySelector(".confirmacion-container");
                        if (data.estado === 'listo') {
                            confir.classList.add('aparicion');
                        } else {
                            confir.classList.remove('aparicion');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error procesando cambio de localStorage:', error);
        }
    }
});

// Agregar estilos
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        to { opacity: 0; transform: translateY(-10px); }
    }
    
    .feedback-flotante {
        pointer-events: none;
    }
`;
document.head.appendChild(style);

// Variable para controlar si ya se recargó
let recargando = false;

// Escuchar cambios de localStorage (para otras pestañas)
window.addEventListener('storage', function(e) {
    console.log('📢 EVENTO STORAGE DETECTADO:', e.key, e.newValue);
    
    // No procesar si ya estamos recargando
    if (recargando) return;
    
    if (e.key === 'pedido_completado' && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            console.log('🔥🔥🔥 PEDIDO COMPLETADO DETECTADO EN OTRO DISPOSITIVO:', data);
            console.log('📊 Datos completos:', data);
            
            // Verificar que el pedido completado es de la misma mesa que estamos viendo
            const mesaActual = obtenerMesaIdNumerico();
            console.log('📍 Mesa actual:', mesaActual);
            console.log('📍 Mesa del pedido completado:', data.mesaId);
            
            if (mesaActual && data.mesaId == mesaActual) {
                console.log('🎯 ES LA MISMA MESA - FORZANDO RECARGA INMEDIATA');
                
                // Marcar que ya vamos a recargar
                recargando = true;
                
                // 1. PONER LA TARJETA EN BLANCO
                const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${data.pedidoId}"]`);
                if (pedidoCard) {
                    console.log('🎨 Poniendo tarjeta en blanco:', data.pedidoId);
                    pedidoCard.style.transition = 'all 0.3s ease';
                    pedidoCard.style.opacity = '0';
                    pedidoCard.style.backgroundColor = '#ffffff';
                    pedidoCard.style.pointerEvents = 'none';
                } else {
                    console.log('⚠️ No se encontró la tarjeta con ID:', data.pedidoId);
                }
                
                // 2. DESHABILITAR TODA INTERACCIÓN
                document.querySelectorAll('button, a, .btn-estado, .btn-confirmacion').forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.3';
                    btn.style.pointerEvents = 'none';
                    btn.style.cursor = 'not-allowed';
                });
                
                // 3. MOSTRAR MENSAJE DE RECARGA
                const overlay = document.createElement('div');
                overlay.id = 'recarga-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                `;
                overlay.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 60px; margin-bottom: 20px;">🔄</div>
                        <div>PEDIDO COMPLETADO EN OTRO DISPOSITIVO</div>
                        <div style="font-size: 20px; margin-top: 20px;">Recargando página en 1 segundo...</div>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                // 4. FORZAR RECARGA DESPUÉS DE 1 SEGUNDO
                console.log('⏰ INICIANDO TEMPORIZADOR DE 1 SEGUNDO');
                setTimeout(() => {
                    console.log('🔥🔥🔥 EJECUTANDO RECARGA AHORA MISMO');
                    
                    // Múltiples métodos de recarga
                    try {
                        // Método 1: El más directo
                        window.location.reload(true);
                    } catch(e) {
                        console.error('Error método 1:', e);
                    }
                    
                    // Método 2: Respaldo
                    setTimeout(() => {
                        window.location.href = window.location.href;
                    }, 100);
                    
                }, 1000);
            } else {
                console.log('❌ No es la misma mesa, ignorando');
            }
            
        } catch (error) {
            console.error('❌ Error procesando evento:', error);
            console.error('Error details:', error.message);
        }
    }
});

// También agregar un event listener para debuggear TODOS los cambios en localStorage
window.addEventListener('storage', function(e) {
    console.log('📦 Todos los cambios en localStorage:', {
        key: e.key,
        oldValue: e.oldValue,
        newValue: e.newValue,
        url: e.url,
        storageArea: e.storageArea
    });
});
