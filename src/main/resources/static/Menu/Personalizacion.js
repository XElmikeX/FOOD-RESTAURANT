document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".btnPersonalizar").forEach(btn => {
        btn.addEventListener("click", function() {
            const platoDiv = this.closest(".plato");
            const panel = platoDiv.querySelector(".panelPersonalizacion");
            panel.style.display = "block";
            platoDiv.classList.add("platoTextarea");
        });
    });

    document.querySelectorAll(".botonesPersonalizacion .btnCancelar").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            const platoDiv = this.closest(".plato");
            const panel = platoDiv.querySelector(".panelPersonalizacion");
            const texto= platoDiv.querySelector(".personalizacion .panelPersonalizacion .detallePersonalizacion")

            panel.style.display = "none";
            platoDiv.classList.remove("platoTextarea");

            texto.value = '';
        });
    });

    document.querySelectorAll(".botonesPersonalizacion .btnGuardar").forEach(btn => {
        btn.addEventListener("click", function(e) {

            e.preventDefault();
            const plato = this.closest(".plato");
            const texto = plato.querySelector(".panelPersonalizacion .detallePersonalizacion")
            const boxPerso = plato.querySelector(".personalizacion");
            const btnPerso = boxPerso.querySelector(".btnPersonalizar");
            const panelPerso = boxPerso.querySelector(".panelPersonalizacion");

            if(texto.value.trim() !== '') {
                btnPerso.textContent = "Editar";
                btnPerso.classList.add("editado");

                plato.classList.remove("platoTextarea");
                panelPerso.style.display = "none";
            }else{
                alert("Por favor, escribe algún detalle para guardar.");
            }
        });
    });

    function arrayDePedidos() {
        const pedidos = [];
        const platos = document.querySelectorAll(".plato");

        platos.forEach(plato => {
            const contenido = plato.querySelector(".cantidad .cantidadInput");
            const cantidad = parseInt(contenido.value);

            if (cantidad > 0) {
                const pedido = {
                    comida: plato.dataset.id,  
                    nombre: plato.dataset.nombre,
                    cantidad: cantidad,
                    nota: '',
                }

                const notaPersonalizacion = plato.querySelector(".personalizacion .panelPersonalizacion .detallePersonalizacion");
                if (notaPersonalizacion && notaPersonalizacion.value.trim() !== '') {
                    pedido.nota = notaPersonalizacion.value.trim();
                }

            pedidos.push(pedido);
            }
        });
        return pedidos;
    }

    
    function mostrarPedidos(pedidos){
        const menuEnviar = document.getElementById("menuEnviar");

        let menuSolicitado = '<div class="Nmesa"><strong>Número de Mesa: </strong>' + document.getElementById("idMesa").value + '</div>';
        if (pedidos.length === 0){
            menuSolicitado += '<div class="cajaSelect"><p class="nullSelect">No hay pedidos Seleccionados</p></div>';
        }else{
            menuSolicitado += '<h5 class="titMenu">Menú:</h5><div class="ordenMenu"><ul>';
            pedidos.forEach(pedido=>{
                menuSolicitado += `<li>${pedido.nombre} x${pedido.cantidad}</li>`;

                if (pedido.nota.trim() !== ''){
                    menuSolicitado +=   `<em>Detalle: ${pedido.nota}</em>`;
                }
            });
            menuSolicitado += '</ul></div>';
        }

        menuEnviar.innerHTML = menuSolicitado;
    }

    const btnPedir = document.getElementById("pedirBtn");
    const boxConfir = document.querySelector(".Pedir .segPedir");
    btnPedir.addEventListener('click',()=>{
        const pedidos = arrayDePedidos();
        mostrarPedidos(pedidos);

        boxConfir.style.display="block";
    })

    const btnConfirCancelar = document.querySelector(".segPedir .btnConfirmacion .btnConfigCancelar");
    btnConfirCancelar.addEventListener("click",()=>{

        boxConfir.style.display="none";
    })

    const formMenu = document.getElementById("formPedidos");
    const listMenu = document.getElementById("datosPedido")
    const btnConfirGuardar = document.querySelector(".segPedir .btnConfirmacion .btnConfigGuardar");
    btnConfirGuardar.addEventListener("click",function(event){
    event.preventDefault();

    const pedidos = arrayDePedidos();

    listMenu.value = JSON.stringify(pedidos);
    
    formMenu.submit();
})

    
    window.addEventListener('click', function(event) {
        const segPedir = document.querySelector('.segPedir');
        const pedirBtn = document.getElementById('pedirBtn');
        if (!segPedir.contains(event.target) && event.target !== pedirBtn) {
            segPedir.style.display = 'none';
        }
    });
});
