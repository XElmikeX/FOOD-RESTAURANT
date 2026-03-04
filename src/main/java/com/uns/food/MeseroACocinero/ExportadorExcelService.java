package com.uns.food.MeseroACocinero;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ExportadorExcelService {

    @Autowired
    private GoogleSheetsService googleSheetsService;
    
    @Autowired
    private PedidosRepository pedidosRepository;
    
    @Autowired
    private MesasRepository mesasRepository;

    @Transactional
    public void exportarPedidosAFacturar(Long mesaId) throws IOException {
        // 1. Obtener TODOS los pedidos de la mesa
        List<Pedidos> pedidosCompletados = pedidosRepository.findByMesaIdAndCompletadoTrue(mesaId);
        List<Pedidos> pedidosPendientes = pedidosRepository.findByMesaIdAndCompletadoFalse(mesaId);
        
        System.out.println("📊 Facturando mesa " + mesaId + ":");
        System.out.println("   - Completados: " + pedidosCompletados.size() + " (se guardarán en Excel)");
        System.out.println("   - Pendientes: " + pedidosPendientes.size() + " (se eliminarán sin guardar)");
        
        // 2. Guardar en Excel SOLO los completados
        if (!pedidosCompletados.isEmpty()) {
            List<PortalController.PedidoFacturaDTO> pedidosDTO = pedidosCompletados.stream()
                .map(PortalController.PedidoFacturaDTO::new)
                .collect(Collectors.toList());
            
            googleSheetsService.guardarFactura(mesaId, pedidosDTO);
            System.out.println("✅ " + pedidosCompletados.size() + " pedidos exportados a Google Sheets");
        }
        
        // 3. ELIMINAR TODOS los pedidos de la mesa (completados Y pendientes)
        List<Pedidos> todosLosPedidos = new ArrayList<>();
        todosLosPedidos.addAll(pedidosCompletados);
        todosLosPedidos.addAll(pedidosPendientes);
        
        if (!todosLosPedidos.isEmpty()) {
            pedidosRepository.deleteAll(todosLosPedidos);
            System.out.println("🗑️ Eliminados " + todosLosPedidos.size() + " pedidos de la mesa " + mesaId);
        }
        
        // 4. Actualizar estado de la mesa
        Optional<Mesas> mesaOpt = mesasRepository.findById(mesaId);
        if (mesaOpt.isPresent()) {
            Mesas mesa = mesaOpt.get();
            mesa.setPendiente(false);
            mesasRepository.save(mesa);
            System.out.println("✅ Mesa " + mesaId + " marcada como sin pedidos");
        }
        
        System.out.println("💰 Mesa " + mesaId + " facturada completamente");
    }

    public Map<String, Object> obtenerResumenDiario() throws IOException {
        return googleSheetsService.obtenerResumenDiario();
    }

    public String getUrlGoogleSheet() {
        return googleSheetsService.getUrlHoja();
    }
    
    public boolean existeArchivoExcel() {
        return false;
    }
}