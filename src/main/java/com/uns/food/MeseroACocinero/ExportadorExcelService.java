package com.uns.food.MeseroACocinero;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExportadorExcelService {

    @Autowired
    private GoogleSheetsService googleSheetsService;
    
    @Autowired
    private PedidosRepository pedidosRepository;

    public void exportarPedidosAFacturar(Long mesaId) throws IOException {
        // Obtener pedidos completados de la mesa
        List<Pedidos> pedidos = pedidosRepository.findByMesaIdAndCompletadoTrue(mesaId);
        
        if (pedidos.isEmpty()) {
            return;
        }

        // Convertir a DTOs
        List<PortalController.PedidoFacturaDTO> pedidosDTO = pedidos.stream()
            .map(PortalController.PedidoFacturaDTO::new)
            .collect(Collectors.toList());
        
        // Guardar en Google Sheets con el formato exacto de tu imagen
        googleSheetsService.guardarFactura(mesaId, pedidosDTO);
        
        // Eliminar los pedidos después de exportarlos
        pedidosRepository.deleteAll(pedidos);
        
        System.out.println("✅ Mesa " + mesaId + " facturada y guardada en Google Sheets");
    }

    public Map<String, Object> obtenerResumenDiario() throws IOException {
        return googleSheetsService.obtenerResumenDiario();
    }

    public String getUrlGoogleSheet() {
        return googleSheetsService.getUrlHoja();
    }
    
    public boolean existeArchivoExcel() {
        // Ya no usamos archivo local, pero mantenemos el método para compatibilidad
        return false;
    }
}