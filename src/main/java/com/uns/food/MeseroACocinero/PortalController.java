package com.uns.food.MeseroACocinero;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Controller
public class PortalController {

    @GetMapping("/")
    public String inicio(){
        return "inicio";
    }
    
    @Autowired
    public MesasRepository mesasRepository;

    @GetMapping("/Rol/Mozo")
    public String apartadoMozo(Model model){
        List<Mesas> Nmesas = mesasRepository.findAll();
        model.addAttribute("Nmesas", Nmesas);
        model.addAttribute("titulo", "Sistema de Pedidos - Mozo");
        return "Mozo";
    }

    @Autowired
    public FoodsRepository foodsRepository;

    @GetMapping("/mesa/{numero}")
    public String ListaDelMenu(@PathVariable("numero") String numero, Model model){
        List<Foods> comida = foodsRepository.findAll();
        model.addAttribute("comida", comida);
        model.addAttribute("numero", numero);
        model.addAttribute("titulo", "Sistema de Pedidos - Mozo");
        return "Menu";
    }

    @Autowired
    public PedidosRepository pedidosRepository;

    @PostMapping("/cocinero")
    public String enviarMenuACocinero(
    @RequestParam String datosPedido,
    @RequestParam String idMesa) {
    
    try {     
        ObjectMapper mapper = new ObjectMapper();
        List<PedidoDTO> pedidosDTO = mapper.readValue(
            datosPedido, 
            new TypeReference<List<PedidoDTO>>() {}
        );
        
        Optional<Mesas> mesaOpt = mesasRepository.findById(Long.parseLong(idMesa));
        
        if (mesaOpt.isPresent()) {
            Mesas mesa = mesaOpt.get();
        
            mesa.setPendiente(true);
            mesasRepository.save(mesa);
            
            for (PedidoDTO pedidoDTO : pedidosDTO) {
                
                try {
                    Long comidaId = Long.parseLong(pedidoDTO.getComidaId());
                    Optional<Foods> comidaOpt = foodsRepository.findById(comidaId);
                    
                    if (comidaOpt.isPresent()) {
                        Foods comida = comidaOpt.get();
                        
                        Pedidos pedido = new Pedidos();
                        pedido.setComida(comida);
                        pedido.setCantidad(pedidoDTO.getCantidad());
                        pedido.setNota(pedidoDTO.getNota());
                        pedido.setMesa(mesa);
                        pedido.setPrecioUnitario(comida.getPrecio());
                        pedido.setPrecioTotal(comida.getPrecio() * pedidoDTO.getCantidad());
                        
                        pedidosRepository.save(pedido);
                    } else {
                        System.err.println("Comida no encontrada con ID: " + pedidoDTO.getComidaId());
                    }
                } catch (NumberFormatException e) {
                    System.err.println("Error al parsear comidaId: " + pedidoDTO.getComidaId());
                }
            }
        } else {
            System.err.println("Mesa no encontrada con ID: " + idMesa);
        }
        
    } catch (Exception e) {
        System.err.println("Error al guardar pedidos: " + e.getMessage());
        e.printStackTrace();
    }
    
    return "redirect:/Rol/Mozo";
}

    // Clase DTO para recibir los pedidos desde JavaScript
    public static class PedidoDTO {
        private String comida;
        private String nombre;
        private int cantidad;
        private String nota;
        
        public String getComidaId(){ 
            return comida; 
        } 

        public void setComida(String comida) { 
            this.comida = comida; 
        }
        
        public String getNombre() { 
            return nombre; 
        }

        public void setNombre(String nombre) { 
            this.nombre = nombre; 
        }
        
        public int getCantidad() { 
            return cantidad; 
        }
        public void setCantidad(int cantidad) { 
            this.cantidad = cantidad; 
        }
        
        public String getNota() { 
            return nota; 
        }
        public void setNota(String nota) { 
            this.nota = nota; 
        }
    }

    @GetMapping("/Rol/Cocinero")
    public String mostrarCocina(Model model) {

        List<Mesas> mesasPendientes = new ArrayList<>();
        List<Mesas> todasMesasPendientes = mesasRepository.findByPendienteTrue();
        
        Map<Long, LocalDateTime> horasPorMesa = new HashMap<>();
        
        for (Mesas mesa : todasMesasPendientes) {
            List<Pedidos> pedidosMesa = pedidosRepository.findByMesaIdAndCompletadoFalse(mesa.getId());
            if (!pedidosMesa.isEmpty()) {
                mesasPendientes.add(mesa);
                    
                Optional<Pedidos> ultimoPedido = pedidosMesa.stream()
                    .filter(p -> p.getHora() != null)
                    .max(Comparator.comparing(Pedidos::getHora));
                    
                if (ultimoPedido.isPresent()) {
                    horasPorMesa.put(mesa.getId(), ultimoPedido.get().getHora());
                }
            }
        }
        
        model.addAttribute("mesasPendientes", mesasPendientes);
        model.addAttribute("horasPorMesa", horasPorMesa);
        model.addAttribute("totalPedidos", mesasPendientes.size());

        return "Cocinero";
    }

    @GetMapping("/Rol/Cocinero/mesa/{mesaId}")
    public String mostrarPedidosMesa(@PathVariable("mesaId") Long mesaId, Model model) {
        Optional<Mesas> mesaOpt = mesasRepository.findById(mesaId);
        if (mesaOpt.isPresent()) {
            model.addAttribute("mesa", mesaOpt.get());
        }
        
        List<Pedidos> pedidosMesa = pedidosRepository.findByMesaIdAndCompletadoFalse(mesaId);
        model.addAttribute("pedidosMesa", pedidosMesa);
        
        return "Pendientes";
    }

    @PostMapping("/completarPedido/{pedidoId}")
    @ResponseBody
    public ResponseEntity<String> completarPedido(@PathVariable("pedidoId") Long pedidoId) {
        
        Optional<Pedidos> pedidoOpt = pedidosRepository.findById(pedidoId);
        
        if (!pedidoOpt.isPresent()) {
            return ResponseEntity.status(404).body("Pedido no encontrado");
        }
        
        Pedidos pedido = pedidoOpt.get();
        pedido.setCompletado(true);
        pedido.setHoraCompletado(LocalDateTime.now());
        pedidosRepository.save(pedido);
        
        List<Pedidos> pedidosRestantes = pedidosRepository.findByMesaIdAndCompletadoFalse(pedido.getMesa().getId());
        
        if (pedidosRestantes.isEmpty()) {
            Mesas mesa = pedido.getMesa();
            mesa.setPendiente(false);
            mesasRepository.save(mesa);
        }
        
        return ResponseEntity.ok("Pedido completado exitosamente");
    }

    @GetMapping("/Rol/Facturero")
    public String apartadoFactuero(Model model) {
        
        try {
            // Obtener todos los pedidos completados (listos para facturar)
            List<Pedidos> pedidosCompletados = pedidosRepository.findByCompletadoTrue();
            
            // Si no hay pedidos, mostrar vista vacía
            if (pedidosCompletados == null || pedidosCompletados.isEmpty()) {
                model.addAttribute("mesasFactura", new ArrayList<>());
                model.addAttribute("totalVentas", 0.0);
                model.addAttribute("totalMesas", 0);
                model.addAttribute("totalPedidos", 0);
                model.addAttribute("mesasJson", "[]");
                return "Facturero";
            }
            
            // Filtrar pedidos que tienen mesa asociada
            List<Pedidos> pedidosConMesa = pedidosCompletados.stream()
                .filter(p -> p.getMesa() != null)
                .collect(Collectors.toList());
            
            // Agrupar pedidos por mesa
            Map<Long, List<Pedidos>> pedidosPorMesa = pedidosConMesa.stream()
                .collect(Collectors.groupingBy(p -> p.getMesa().getId()));
            
            // Crear lista de mesas con sus pedidos y totales
            List<MesaFacturaDTO> mesasFactura = new ArrayList<>();
            double totalVentas = 0;
            
            for (Map.Entry<Long, List<Pedidos>> entry : pedidosPorMesa.entrySet()) {
                Long mesaId = entry.getKey();
                List<Pedidos> pedidos = entry.getValue();
                
                // Calcular total de la mesa (manejando nulls)
                double totalMesa = pedidos.stream()
                    .mapToDouble(p -> {
                        Double precio = p.getPrecioTotal();
                        return precio != null ? precio : 0.0;
                    })
                    .sum();
                
                totalVentas += totalMesa;
                
                // Crear DTOs para los pedidos con información formateada
                List<PedidoFacturaDTO> pedidosDTO = pedidos.stream()
                    .map(p -> new PedidoFacturaDTO(p))
                    .collect(Collectors.toList());
                
                Optional<Mesas> mesaOpt = mesasRepository.findById(mesaId);
                String numeroMesa = mesaOpt.map(m -> String.valueOf(m.getId())).orElse("N/A");
                
                mesasFactura.add(new MesaFacturaDTO(
                    mesaId,
                    numeroMesa,
                    pedidosDTO,
                    totalMesa
                ));
            }
            
            // Ordenar mesas por fecha de pedido más reciente (manejando nulls)
            mesasFactura.sort((m1, m2) -> {
                LocalDateTime max1 = m1.getPedidos().stream()
                    .map(PedidoFacturaDTO::getHoraCompletado)
                    .filter(h -> h != null)
                    .max(LocalDateTime::compareTo)
                    .orElse(LocalDateTime.MIN);
                    
                LocalDateTime max2 = m2.getPedidos().stream()
                    .map(PedidoFacturaDTO::getHoraCompletado)
                    .filter(h -> h != null)
                    .max(LocalDateTime::compareTo)
                    .orElse(LocalDateTime.MIN);
                    
                return max2.compareTo(max1);
            });
            
            // Convertir a JSON para JavaScript
            ObjectMapper mapper = new ObjectMapper();
            String mesasJson = "[]";
            try {
                mesasJson = mapper.writeValueAsString(mesasFactura);
            } catch (Exception e) {
                System.err.println("Error al convertir a JSON: " + e.getMessage());
                e.printStackTrace();
            }
            
            model.addAttribute("mesasFactura", mesasFactura);
            model.addAttribute("totalVentas", totalVentas);
            model.addAttribute("totalMesas", mesasFactura.size());
            model.addAttribute("totalPedidos", pedidosConMesa.size());
            model.addAttribute("mesasJson", mesasJson);
            
        } catch (Exception e) {
            System.err.println("Error en apartadoFactuero: " + e.getMessage());
            e.printStackTrace();
            
            // En caso de error, mostrar vista vacía
            model.addAttribute("mesasFactura", new ArrayList<>());
            model.addAttribute("totalVentas", 0.0);
            model.addAttribute("totalMesas", 0);
            model.addAttribute("totalPedidos", 0);
            model.addAttribute("mesasJson", "[]");
        }
        
        return "Facturero";
    }

    @Autowired
    private ExportadorExcelService exportadorExcelService;
    
    @PostMapping("/eliminarPedidosMesa/{mesaId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> eliminarPedidosMesa(@PathVariable("mesaId") Long mesaId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Verificar que el servicio está inyectado correctamente
            if (exportadorExcelService == null) {
                throw new RuntimeException("El servicio ExportadorExcelService no está disponible");
            }
            
            // Usar el servicio de Excel para exportar y eliminar
            exportadorExcelService.exportarPedidosAFacturar(mesaId);
            
            // Obtener el resumen actualizado
            Map<String, Object> resumen = exportadorExcelService.obtenerResumenDiario();
            
            response.put("success", true);
            response.put("message", "✅ Pedidos facturados y guardados en Excel");
            response.put("resumen", resumen.get("dias"));
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al facturar: " + e.getMessage());
            e.printStackTrace();
        }
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/api/detalleMesa/{mesaId}")
    @ResponseBody
    public ResponseEntity<MesaFacturaDTO> getDetalleMesa(@PathVariable("mesaId") Long mesaId) {
        
        List<Pedidos> pedidosMesa = pedidosRepository.findByMesaIdAndCompletadoTrue(mesaId);
        
        if (pedidosMesa == null || pedidosMesa.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        List<PedidoFacturaDTO> pedidosDTO = pedidosMesa.stream()
            .map(PedidoFacturaDTO::new)
            .collect(Collectors.toList());
        
        double total = pedidosMesa.stream()
            .mapToDouble(p -> {
                Double precio = p.getPrecioTotal();
                return precio != null ? precio : 0.0;
            })
            .sum();
        
        Optional<Mesas> mesaOpt = mesasRepository.findById(mesaId);
        String numeroMesa = mesaOpt.map(m -> String.valueOf(m.getId())).orElse("N/A");
        
        MesaFacturaDTO mesaDTO = new MesaFacturaDTO(
            mesaId,
            numeroMesa,
            pedidosDTO,
            total
        );
        
        return ResponseEntity.ok(mesaDTO);
    }
    
    // DTOs para facturación
    public static class PedidoFacturaDTO {
        private Long id;
        private String nombreProducto;
        private int cantidad;
        private String nota;
        private Double precioUnitario;
        private Double precioTotal;
        private LocalDateTime hora;
        private LocalDateTime horaCompletado;
        
        public PedidoFacturaDTO(Pedidos pedido) {
            this.id = pedido.getId();
            this.nombreProducto = pedido.getNombreProducto();
            this.cantidad = pedido.getCantidad();
            this.nota = pedido.getNota() != null ? pedido.getNota() : "";
            this.precioUnitario = pedido.getPrecioUnitario() != null ? pedido.getPrecioUnitario() : 0.0;
            this.precioTotal = pedido.getPrecioTotal() != null ? pedido.getPrecioTotal() : 0.0;
            this.hora = pedido.getHora();
            this.horaCompletado = pedido.getHoraCompletado();
        }
        
        // Getters y setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        
        public String getNombreProducto() { return nombreProducto; }
        public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }
        
        public int getCantidad() { return cantidad; }
        public void setCantidad(int cantidad) { this.cantidad = cantidad; }
        
        public String getNota() { return nota; }
        public void setNota(String nota) { this.nota = nota; }
        
        public Double getPrecioUnitario() { return precioUnitario; }
        public void setPrecioUnitario(Double precioUnitario) { this.precioUnitario = precioUnitario; }
        
        public Double getPrecioTotal() { return precioTotal; }
        public void setPrecioTotal(Double precioTotal) { this.precioTotal = precioTotal; }
        
        public LocalDateTime getHora() { return hora; }
        public void setHora(LocalDateTime hora) { this.hora = hora; }
        
        public LocalDateTime getHoraCompletado() { return horaCompletado; }
        public void setHoraCompletado(LocalDateTime horaCompletado) { this.horaCompletado = horaCompletado; }
    }
    
    public static class MesaFacturaDTO {
        private Long id;
        private String numero;
        private List<PedidoFacturaDTO> pedidos;
        private double total;
        
        public MesaFacturaDTO(Long id, String numero, List<PedidoFacturaDTO> pedidos, double total) {
            this.id = id;
            this.numero = numero;
            this.pedidos = pedidos;
            this.total = total;
        }
        
        // Getters y setters
        public Long getId() { 
            return id; 
        }
        public void setId(Long id) { 
            this.id = id; 
        }
        
        public String getNumero() { 
            return numero; 
        }
        public void setNumero(String numero) { 
            this.numero = numero; 
        }
        
        public List<PedidoFacturaDTO> getPedidos() { 
            return pedidos; 
        }
        public void setPedidos(List<PedidoFacturaDTO> pedidos) { 
            this.pedidos = pedidos; 
        }
        
        public double getTotal() { 
            return total; 
        }
        public void setTotal(double total) { 
            this.total = total; 
        }
    }
}