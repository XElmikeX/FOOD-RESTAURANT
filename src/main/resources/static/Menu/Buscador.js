// Buscador.js - Agrega esto como nuevo archivo o intégralo en SumRes.js

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const buscador = document.getElementById('buscadorMenu');
    const clearButton = document.getElementById('clearSearch');
    const searchStats = document.getElementById('searchStats');
    const platos = document.querySelectorAll('.plato');
    const formPedidos = document.getElementById('formPedidos');
    
    // Variable para el timeout del debounce
    let searchTimeout;
    
    // Función principal de búsqueda
    function buscarPlatos(termino) {
        termino = termino.toLowerCase().trim();
        let contador = 0;
        
        platos.forEach(plato => {
            const nombrePlato = plato.dataset.nombre.toLowerCase();
            const coincide = termino === '' || nombrePlato.includes(termino);
            
            if (coincide) {
                plato.style.display = ''; // Mostrar (usa el display original)
                contador++;
                
                // Resaltar el texto si hay término de búsqueda
                if (termino !== '') {
                    plato.classList.add('highlight');
                    
                    // Scroll suave al primer resultado
                    if (contador === 1) {
                        setTimeout(() => {
                            plato.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }
                } else {
                    plato.classList.remove('highlight');
                }
            } else {
                plato.style.display = 'none';
                plato.classList.remove('highlight');
            }
        });
        
        // Actualizar estadísticas
        actualizarStats(termino, contador);
        
        // Mostrar mensaje si no hay resultados
        mostrarMensajeNoResultados(termino, contador);
    }
    
    // Actualizar estadísticas de búsqueda
    function actualizarStats(termino, contador) {
        if (termino === '') {
            searchStats.textContent = `Mostrando todos los platos (${platos.length})`;
            clearButton.classList.remove('visible');
        } else {
            searchStats.textContent = `Encontrados ${contador} de ${platos.length} platos`;
            clearButton.classList.add('visible');
        }
    }
    
    // Mostrar mensaje cuando no hay resultados
    function mostrarMensajeNoResultados(termino, contador) {
        // Eliminar mensaje anterior si existe
        const mensajeAnterior = document.querySelector('.no-results');
        if (mensajeAnterior) {
            mensajeAnterior.remove();
        }
        
        // Si no hay resultados y hay término de búsqueda
        if (contador === 0 && termino !== '') {
            const mensaje = document.createElement('div');
            mensaje.className = 'no-results';
            mensaje.innerHTML = `
                <i class="fas fa-utensils"></i>
                <p>No encontramos "${termino}"</p>
                <small>Prueba con otro término o categoría</small>
            `;
            formPedidos.appendChild(mensaje);
        }
    }
    
    // Evento input con debounce (para no buscar en cada tecla)
    buscador.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        
        const termino = e.target.value;
        
        searchTimeout = setTimeout(() => {
            buscarPlatos(termino);
        }, 300); // Espera 300ms después de que el usuario deje de escribir
    });
    
    // Limpiar búsqueda
    clearButton.addEventListener('click', function() {
        buscador.value = '';
        buscarPlatos('');
        buscador.focus();
    });
    
    // Búsqueda por categorías (si tienes botones de categoría)
    function filtrarPorCategoria(categoria) {
        let contador = 0;
        
        platos.forEach(plato => {
            // Asumiendo que tienes data-categoria en cada plato
            const platoCategoria = plato.dataset.categoria;
            const coincide = categoria === 'todos' || platoCategoria === categoria;
            
            if (coincide) {
                plato.style.display = '';
                contador++;
            } else {
                plato.style.display = 'none';
            }
        });
        
        searchStats.textContent = `${categoria}: ${contador} platos`;
    }
    
    // Tecla ESC para limpiar
    buscador.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            buscador.value = '';
            buscarPlatos('');
        }
    });
    
    // Inicializar stats
    actualizarStats('', platos.length);
});

// Función adicional para búsqueda avanzada (opcional)
function busquedaAvanzada(termino) {
    // Aquí podrías implementar búsqueda por:
    // - Ingredientes
    // - Precio
    // - Categoría
    // etc.
    
    const palabras = termino.toLowerCase().split(' ');
    
    document.querySelectorAll('.plato').forEach(plato => {
        const nombre = plato.dataset.nombre.toLowerCase();
        // const descripcion = plato.dataset.descripcion?.toLowerCase() || '';
        // const categoria = plato.dataset.categoria?.toLowerCase() || '';
        
        // Buscar si alguna palabra coincide
        const coincide = palabras.some(palabra => 
            nombre.includes(palabra) 
            // descripcion.includes(palabra) || 
            // categoria.includes(palabra)
        );
        
        plato.style.display = coincide ? '' : 'none';
    });
}