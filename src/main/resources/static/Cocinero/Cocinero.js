let intervaloActualizacion;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Cocinero.js cargado - Actualización automática cada 3 segundos');
    
    iniciarActualizacionAutomatica();
});

// Función para iniciar la actualización automática
function iniciarActualizacionAutomatica() {
    // Limpiar intervalo anterior si existe
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
    }
    
    // Actualizar cada 3 segundos
    intervaloActualizacion = setInterval(function() {
        console.log('🔄 Actualizando contenedor de mesas...');
        actualizarMesasContainer();
    }, 3000);
}

function actualizarMesasContainer() {
    console.log('📦 Actualizando mesas-container...');
    
    fetch(window.location.href)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Obtener el nuevo mesas-container
            const nuevoMesasContainer = doc.querySelector('.mesas-container');
            const actualMesasContainer = document.querySelector('.mesas-container');
            
            if (nuevoMesasContainer && actualMesasContainer) {
                // Reemplazar solo el contenido del mesas-container
                actualMesasContainer.innerHTML = nuevoMesasContainer.innerHTML;
                console.log('✅ Mesas-container actualizado correctamente');
                
                // Actualizar el contador de total de pedidos
                const nuevoTotal = doc.querySelector('.total-pedidos span');
                const actualTotal = document.querySelector('.total-pedidos span');
                
                if (nuevoTotal && actualTotal) {
                    actualTotal.textContent = nuevoTotal.textContent;
                }
            } else {
                console.log('⚠️ No se encontró el mesas-container');
            }
        })
        .catch(error => {
            console.error('❌ Error actualizando mesas-container:', error);
        });
}