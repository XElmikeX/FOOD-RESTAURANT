// EstadoPedidoController.java
package com.uns.food.MeseroACocinero;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

// EstadoPedidoController.java

@RestController
@RequestMapping("/api/pedidos")
public class EstadoPedidoController {

    @Autowired
    private PedidosRepository pedidosRepository;
    
    @Autowired
    private MesasRepository mesasRepository;

    @PostMapping("/actualizar-estado/{pedidoId}")
    public ResponseEntity<Map<String, Object>> actualizarEstado(
            @PathVariable("pedidoId") Long pedidoId,
            @RequestBody Map<String, String> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String nuevoEstado = request.get("estado");
            
            Optional<Pedidos> pedidoOpt = pedidosRepository.findById(pedidoId);
            
            if (!pedidoOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Pedido no encontrado");
                return ResponseEntity.status(404).body(response);
            }
            
            Pedidos pedido = pedidoOpt.get();
            Long mesaId = pedido.getMesa().getId();
            
            // 🔥 IMPORTANTE: Buscar TODOS los pedidos de esta mesa
            List<Pedidos> todosLosPedidosMesa = pedidosRepository.findByMesaId(mesaId);
            
            boolean primerInteraccion = false;
            
            // Verificar si es la primera interacción en esta mesa
            for (Pedidos p : todosLosPedidosMesa) {
                if (p.getCocineroInteractuo()) {
                    primerInteraccion = true;
                    break;
                }
            }
            
            // Si es la primera interacción, marcar TODOS los pedidos de la mesa como interactuados
            if (!primerInteraccion) {
                System.out.println("🔥 Primera interacción en mesa " + mesaId + 
                                " - Marcando TODOS los " + todosLosPedidosMesa.size() + 
                                " pedidos como interactuados");
                
                for (Pedidos p : todosLosPedidosMesa) {
                    p.setCocineroInteractuo(true);
                    pedidosRepository.save(p);
                }
            }
            
            // Actualizar el estado del pedido actual
            pedido.setEstado(nuevoEstado);
            
            if ("listo".equals(nuevoEstado)) {
                pedido.setCompletado(false);
            }
            
            pedidosRepository.save(pedido);
            
            // Obtener todos los pedidos de la mesa para el resumen
            List<Pedidos> pedidosMesa = pedidosRepository.findByMesaId(mesaId);
            
            response.put("success", true);
            response.put("message", "Estado actualizado correctamente");
            response.put("mesaId", mesaId);
            response.put("totalPedidos", pedidosMesa.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al actualizar estado: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/todas-mesas-estados")
    public ResponseEntity<Map<String, Object>> obtenerTodasMesasConEstados() {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 🔥 CAMBIO: Incluir pedidos completados pero NO facturados
            // Buscamos pedidos donde:
            // - El cocinero haya interactuado (true) 
            // - Y que NO estén facturados (para eso necesitamos un campo "facturado")
            
            // Por ahora, como no tenemos campo facturado, usamos completado como indicador
            // pero debemos diferenciar:
            // - completado = true → Listo para facturar (visible en Mozo)
            // - facturado = true → Ya no visible (necesitaríamos agregar este campo)
            
            List<Object[]> resultados = pedidosRepository.contarPedidosVisiblesParaMozo();
            
            Map<Long, Map<String, Integer>> resumenPorMesa = new HashMap<>();
            Map<Long, List<Map<String, Object>>> pedidosPorMesa = new HashMap<>();
            
            // Obtener todas las mesas
            List<Mesas> todasMesas = mesasRepository.findAll();
            
            // Inicializar mapas
            for (Mesas mesa : todasMesas) {
                Map<String, Integer> estados = new HashMap<>();
                estados.put("pendiente", 0);
                estados.put("proceso", 0);
                estados.put("listo", 0);
                estados.put("completado", 0); // 🔥 NUEVO: estado para pedidos completados
                resumenPorMesa.put(mesa.getId(), estados);
                pedidosPorMesa.put(mesa.getId(), new ArrayList<>());
            }
            
            // Llenar con los resultados de conteo
            for (Object[] resultado : resultados) {
                Long mesaId = (Long) resultado[0];
                String estado = (String) resultado[1];
                Long count = (Long) resultado[2];
                
                if (resumenPorMesa.containsKey(mesaId)) {
                    resumenPorMesa.get(mesaId).put(estado, count.intValue());
                }
            }
            
            // Obtener detalles de los pedidos para cada mesa (visibles para mozo)
            for (Mesas mesa : todasMesas) {
                // 🔥 CAMBIO: Usar nuevo método que incluye completados pero no facturados
                List<Pedidos> pedidosMesa = pedidosRepository.findByMesaIdVisiblesParaMozo(mesa.getId());
                
                for (Pedidos pedido : pedidosMesa) {
                    Map<String, Object> pedidoInfo = new HashMap<>();
                    pedidoInfo.put("id", pedido.getId());
                    pedidoInfo.put("producto", pedido.getNombreProducto());
                    pedidoInfo.put("cantidad", "x" + pedido.getCantidad());
                    pedidoInfo.put("nota", pedido.getNota() != null ? pedido.getNota() : "");
                    
                    // Determinar estado visual para el mozo
                    String estadoVisual = pedido.getEstado();
                    if (pedido.getCompletado()) {
                        estadoVisual = "completado"; // Para mostrarlo de otra forma en el modal
                    }
                    pedidoInfo.put("estado", estadoVisual);
                    pedidoInfo.put("completado", pedido.getCompletado());
                    pedidoInfo.put("hora", pedido.getHora() != null ? pedido.getHora().toString() : null);
                    pedidoInfo.put("horaCompletado", pedido.getHoraCompletado() != null ? pedido.getHoraCompletado().toString() : null);
                    pedidosPorMesa.get(mesa.getId()).add(pedidoInfo);
                }
            }
            
            // Crear la lista de mesas con sus estados
            List<Map<String, Object>> mesasInfo = new ArrayList<>();
            
            for (Mesas mesa : todasMesas) {
                Map<String, Integer> estados = resumenPorMesa.get(mesa.getId());
                boolean tienePedidosVisibles = false;
                
                // Verificar si tiene al menos un pedido visible (con interacción)
                for (Integer count : estados.values()) {
                    if (count > 0) {
                        tienePedidosVisibles = true;
                        break;
                    }
                }
                
                // Solo agregar la mesa si tiene al menos un pedido visible
                if (tienePedidosVisibles) {
                    Map<String, Object> info = new HashMap<>();
                    info.put("id", mesa.getId());
                    info.put("nombre", mesa.getMesa());
                    info.put("pendiente", mesa.getPendiente());
                    info.put("estados", estados);
                    info.put("pedidos", pedidosPorMesa.get(mesa.getId()));
                    info.put("totalPedidos", pedidosPorMesa.get(mesa.getId()).size());
                    
                    // Obtener la hora del pedido más reciente
                    Optional<String> horaReciente = pedidosPorMesa.get(mesa.getId()).stream()
                        .map(p -> (String) p.get("hora"))
                        .filter(h -> h != null)
                        .findFirst();
                    
                    info.put("timestamp", horaReciente.orElse(new Date().toString()));
                    
                    mesasInfo.add(info);
                }
            }
            
            response.put("success", true);
            response.put("mesas", mesasInfo);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/estados-mesa/{mesaId}")
    public ResponseEntity<Map<String, Object>> obtenerEstadosMesa(@PathVariable("mesaId") Long mesaId) {

        Map<String, Object> response = new HashMap<>();
        
        try {
            // 🔥 CAMBIO IMPORTANTE: Usar el nuevo método que trae TODOS los pedidos con interacción
            // (incluyendo los completados)
            List<Pedidos> pedidosMesa = pedidosRepository.findByMesaIdVisiblesParaMozo(mesaId);
            
            List<Map<String, Object>> pedidosInfo = pedidosMesa.stream().map(p -> {
                Map<String, Object> info = new HashMap<>();
                info.put("id", p.getId());
                info.put("producto", p.getNombreProducto());
                info.put("cantidad", "x" + p.getCantidad());
                info.put("nota", p.getNota() != null ? p.getNota() : "");
                
                // Determinar el estado visual
                String estadoVisual;
                if (p.getCompletado()) {
                    estadoVisual = "completado"; // Para pedidos que ya pasaron a facturación
                } else {
                    estadoVisual = p.getEstado() != null ? p.getEstado() : "pendiente";
                }
                
                info.put("estado", estadoVisual);
                info.put("completado", p.getCompletado());
                info.put("hora", p.getHora() != null ? p.getHora().toString() : null);
                info.put("horaCompletado", p.getHoraCompletado() != null ? p.getHoraCompletado().toString() : null);
                info.put("cocineroInteractuo", p.getCocineroInteractuo());
                return info;
            }).collect(Collectors.toList());
            
            Optional<Mesas> mesaOpt = mesasRepository.findById(mesaId);
            String numeroMesa = mesaOpt.map(m -> String.valueOf(m.getId())).orElse("N/A");
            
            response.put("success", true);
            response.put("mesaId", mesaId);
            response.put("numeroMesa", numeroMesa);
            response.put("pedidos", pedidosInfo);
            response.put("totalPedidos", pedidosMesa.size()); // ✅ Esto ahora será el número correcto
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
