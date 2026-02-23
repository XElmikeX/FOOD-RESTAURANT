package com.uns.food.MeseroACocinero;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/pedidos")
public class FacturaController {

    @Autowired
    private ExportadorExcelService exportadorExcelService;

    @Autowired
    private PedidosRepository pedidosRepository;
    
    @Autowired
    private GoogleSheetsService googleSheetsService;

    @PostMapping("/eliminarYGuardar/{mesaId}")
    public ResponseEntity<Map<String, Object>> eliminarYGuardarPedidos(@PathVariable Long mesaId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            exportadorExcelService.exportarPedidosAFacturar(mesaId);
            
            response.put("success", true);
            response.put("message", "✅ Pedidos facturados correctamente");
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al facturar: " + e.getMessage());
            e.printStackTrace();
        }
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/resumen-diario")
    public ResponseEntity<Map<String, Object>> obtenerResumenDiario() {
        try {
            Map<String, Object> resumen = exportadorExcelService.obtenerResumenDiario();
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/ver-excel-web")
    public ResponseEntity<Void> verExcelWeb() {
        try {
            String url = exportadorExcelService.getUrlGoogleSheet();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(java.net.URI.create(url));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/estado-autorizacion")
    @ResponseBody
    public Map<String, Object> verificarAutorizacion() {
        Map<String, Object> response = new HashMap<>();
        if (googleSheetsService != null) {
            response.put("autorizado", googleSheetsService.isAutorizado());
            response.put("url", googleSheetsService.getUrlHoja());
        } else {
            response.put("autorizado", false);
            response.put("error", "Servicio no inicializado");
        }
        return response;
    }
}