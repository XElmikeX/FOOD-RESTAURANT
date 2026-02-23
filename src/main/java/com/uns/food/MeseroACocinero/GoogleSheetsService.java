package com.uns.food.MeseroACocinero;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GoogleSheetsService {

    private static final String APPLICATION_NAME = "Restaurante Facturacion";
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    
    // 🔥 NUEVO: Valores inyectados desde variables de entorno
    @Value("${google.spreadsheet.id}")
    private String spreadsheetId;

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;
    
    private Sheets sheetsService;
    private boolean autorizado = false;
    private Integer sheetIdVentas = null;

    @PostConstruct
    public void init() {
        try {
            // Verificar que las variables se cargaron correctamente
            System.out.println("📊 Configuración cargada:");
            System.out.println("   - Spreadsheet ID: " + spreadsheetId);
            System.out.println("   - Client ID: " + clientId.substring(0, 10) + "...");
            
            this.sheetsService = getSheetsService();
            this.autorizado = true;
            System.out.println("✅ Google Sheets Service inicializado correctamente");
            System.out.println("📁 Los tokens se guardan en: " + new File(TOKENS_DIRECTORY_PATH).getAbsolutePath());
            
            obtenerSheetIdVentas();
            inicializarHoja();
            
        } catch (Exception e) {
            this.autorizado = false;
            System.err.println("❌ Error al inicializar Google Sheets: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private Sheets getSheetsService() throws IOException, GeneralSecurityException {
        // 🔥 NUEVO: Crear GoogleClientSecrets desde las variables de entorno
        GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
        
        // Crear la estructura "installed" que espera Google
        Map<String, String> installed = new HashMap<>();
        installed.put("client_id", clientId);
        installed.put("client_secret", clientSecret);
        installed.put("project_id", "food-restaurant");
        installed.put("auth_uri", "https://accounts.google.com/o/oauth2/auth");
        installed.put("token_uri", "https://oauth2.googleapis.com/token");
        installed.put("auth_provider_x509_cert_url", "https://www.googleapis.com/oauth2/v1/certs");
        installed.put("redirect_uris", "http://localhost:8888/Callback");
        
        clientSecrets.set("installed", installed);

        List<String> scopes = Collections.singletonList(SheetsScopes.SPREADSHEETS);
        
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            JacksonFactory.getDefaultInstance(),
            clientSecrets,
            scopes)
            .setDataStoreFactory(new FileDataStoreFactory(new File(TOKENS_DIRECTORY_PATH)))
            .setAccessType("offline")
            .build();

        LocalServerReceiver receiver = new LocalServerReceiver.Builder()
            .setPort(8888)
            .build();
            
        Credential credential = new AuthorizationCodeInstalledApp(flow, receiver)
            .authorize("user");

        return new Sheets.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            JacksonFactory.getDefaultInstance(),
            credential)
            .setApplicationName(APPLICATION_NAME)
            .build();
    }

    private void obtenerSheetIdVentas() throws IOException {
        Spreadsheet spreadsheet = sheetsService.spreadsheets().get(spreadsheetId).execute();
        
        for (Sheet sheet : spreadsheet.getSheets()) {
            if (sheet.getProperties().getTitle().equals("Ventas")) {
                sheetIdVentas = sheet.getProperties().getSheetId();
                System.out.println("📊 ID de hoja 'Ventas': " + sheetIdVentas);
                break;
            }
        }
    }

    private void inicializarHoja() throws IOException {
        Spreadsheet spreadsheet = sheetsService.spreadsheets().get(spreadsheetId).execute();
        
        Sheet ventasSheet = null;
        for (Sheet sheet : spreadsheet.getSheets()) {
            if (sheet.getProperties().getTitle().equals("Ventas")) {
                ventasSheet = sheet;
                break;
            }
        }
        
        if (ventasSheet == null) {
            List<Request> requests = new ArrayList<>();
            requests.add(new Request().setAddSheet(
                new AddSheetRequest().setProperties(
                    new SheetProperties().setTitle("Ventas"))));
            
            BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest()
                .setRequests(requests);
            
            sheetsService.spreadsheets().batchUpdate(spreadsheetId, batchRequest).execute();
            
            obtenerSheetIdVentas();
        }
    }

    public void guardarFactura(Long mesaId, List<PortalController.PedidoFacturaDTO> pedidos) throws IOException {
        if (!autorizado) {
            throw new IOException("Google Sheets no está autorizado. Revisa los logs.");
        }

        if (sheetIdVentas == null) {
            obtenerSheetIdVentas();
        }

        LocalDateTime ahora = LocalDateTime.now();
        String fecha = ahora.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String fechaCabecera = "Fecha: " + fecha;
        String horaActual = ahora.format(DateTimeFormatter.ofPattern("HH:mm"));
        
        String range = "Ventas!A:D";
        ValueRange response = sheetsService.spreadsheets().values()
            .get(spreadsheetId, range)
            .execute();
        
        List<List<Object>> valoresExistentes = response.getValues();
        
        int filaFechaExistente = -1;
        int filaTotalExistente = -1;
        
        if (valoresExistentes != null) {
            for (int i = 0; i < valoresExistentes.size(); i++) {
                List<Object> fila = valoresExistentes.get(i);
                if (fila != null && !fila.isEmpty() && fila.get(0) != null) {
                    String primeraCelda = fila.get(0).toString();
                    
                    if (primeraCelda.startsWith("Fecha: " + fecha)) {
                        filaFechaExistente = i;
                    }
                    
                    if (filaFechaExistente != -1 && i > filaFechaExistente) {
                        if (primeraCelda.equals("TOTAL DEL DÍA:")) {
                            filaTotalExistente = i;
                            break;
                        }
                    }
                }
            }
        }
        
        if (filaFechaExistente == -1) {
            crearNuevoBloque(fechaCabecera, horaActual, pedidos, valoresExistentes);
        } else {
            agregarABloqueExistente(fecha, fechaCabecera, horaActual, pedidos, 
                                   valoresExistentes, filaFechaExistente, filaTotalExistente);
        }
    }

    private void crearNuevoBloque(String fechaCabecera, String horaActual, 
                                  List<PortalController.PedidoFacturaDTO> pedidos,
                                  List<List<Object>> valoresExistentes) throws IOException {
        
        List<List<Object>> valores = new ArrayList<>();
        
        int filaInicio = (valoresExistentes != null ? valoresExistentes.size() : 0);
        
        if (filaInicio > 0) {
            valores.add(Arrays.asList(""));
        }
        
        valores.add(Arrays.asList(fechaCabecera, "", "", ""));
        valores.add(Arrays.asList("Producto", "Cantidad", "Total", "Hora"));
        
        double totalDia = 0;
        for (PortalController.PedidoFacturaDTO pedido : pedidos) {
            valores.add(Arrays.asList(
                pedido.getNombreProducto(),
                String.valueOf(pedido.getCantidad()),
                "$" + String.format("%.2f", pedido.getPrecioTotal()),
                horaActual
            ));
            totalDia += pedido.getPrecioTotal();
        }
        
        valores.add(Arrays.asList("TOTAL DEL DÍA:", "", "$" + String.format("%.2f", totalDia), ""));
        
        String insertRange = "Ventas!A" + (filaInicio + 1);
        ValueRange body = new ValueRange().setValues(valores);
        
        sheetsService.spreadsheets().values()
            .append(spreadsheetId, insertRange, body)
            .setValueInputOption("USER_ENTERED")
            .setInsertDataOption("INSERT_ROWS")
            .execute();
            
        System.out.println("✅ Nuevo bloque creado para el día " + fechaCabecera);
    }

    private void agregarABloqueExistente(String fecha, String fechaCabecera, String horaActual,
                                        List<PortalController.PedidoFacturaDTO> pedidos,
                                        List<List<Object>> valoresExistentes,
                                        int filaFechaExistente, int filaTotalExistente) throws IOException {
        
        List<Request> deleteRequests = new ArrayList<>();
        deleteRequests.add(new Request().setDeleteDimension(
            new DeleteDimensionRequest()
                .setRange(new DimensionRange()
                    .setSheetId(sheetIdVentas)
                    .setDimension("ROWS")
                    .setStartIndex(filaTotalExistente)
                    .setEndIndex(filaTotalExistente + 1))));
        
        BatchUpdateSpreadsheetRequest deleteBatchRequest = new BatchUpdateSpreadsheetRequest()
            .setRequests(deleteRequests);
        
        sheetsService.spreadsheets().batchUpdate(spreadsheetId, deleteBatchRequest).execute();
        
        ValueRange updatedResponse = sheetsService.spreadsheets().values()
            .get(spreadsheetId, "Ventas!A:D")
            .execute();
        
        List<List<Object>> valoresActualizados = updatedResponse.getValues();
        
        int nuevaFilaFecha = -1;
        int finalProductos = valoresActualizados.size();
        
        for (int i = 0; i < valoresActualizados.size(); i++) {
            List<Object> fila = valoresActualizados.get(i);
            if (fila != null && !fila.isEmpty() && fila.get(0) != null) {
                String primeraCelda = fila.get(0).toString();
                
                if (primeraCelda.startsWith("Fecha: " + fecha)) {
                    nuevaFilaFecha = i;
                }
                
                if (nuevaFilaFecha != -1 && i > nuevaFilaFecha) {
                    if (primeraCelda.startsWith("Fecha:") && !primeraCelda.equals(fechaCabecera)) {
                        finalProductos = i;
                        break;
                    }
                }
            }
        }
        
        double totalExistente = 0;
        int totalProductosExistentes = 0;
        
        for (int i = nuevaFilaFecha + 2; i < finalProductos; i++) {
            List<Object> fila = valoresActualizados.get(i);
            if (fila != null && fila.size() > 2 && fila.get(2) != null) {
                String totalStr = fila.get(2).toString().replace("$", "");
                try {
                    totalExistente += Double.parseDouble(totalStr);
                    totalProductosExistentes++;
                } catch (NumberFormatException e) {}
            }
        }
        
        List<List<Object>> nuevosProductos = new ArrayList<>();
        double totalNuevos = 0;
        for (PortalController.PedidoFacturaDTO pedido : pedidos) {
            nuevosProductos.add(Arrays.asList(
                pedido.getNombreProducto(),
                String.valueOf(pedido.getCantidad()),
                "$" + String.format("%.2f", pedido.getPrecioTotal()),
                horaActual
            ));
            totalNuevos += pedido.getPrecioTotal();
        }
        
        String insertRange = "Ventas!A" + (finalProductos + 1);
        ValueRange body = new ValueRange().setValues(nuevosProductos);
        
        sheetsService.spreadsheets().values()
            .append(spreadsheetId, insertRange, body)
            .setValueInputOption("USER_ENTERED")
            .setInsertDataOption("INSERT_ROWS")
            .execute();
        
        double totalActualizado = totalExistente + totalNuevos;
        int nuevaPosicionTotal = finalProductos + nuevosProductos.size();
        
        List<List<Object>> totalData = new ArrayList<>();
        totalData.add(Arrays.asList("TOTAL DEL DÍA:", "", "$" + String.format("%.2f", totalActualizado), ""));
        
        String totalInsertRange = "Ventas!A" + (nuevaPosicionTotal + 1);
        ValueRange totalBody = new ValueRange().setValues(totalData);
        
        sheetsService.spreadsheets().values()
            .append(spreadsheetId, totalInsertRange, totalBody)
            .setValueInputOption("USER_ENTERED")
            .setInsertDataOption("INSERT_ROWS")
            .execute();
        
        System.out.println("✅ Productos agregados a bloque existente del día " + fecha);
        System.out.println("   Total actualizado: $" + String.format("%.2f", totalActualizado));
    }

    public Map<String, Object> obtenerResumenDiario() throws IOException {
        String range = "Ventas!A:D";
        ValueRange response = sheetsService.spreadsheets().values()
            .get(spreadsheetId, range)
            .execute();
        
        List<List<Object>> valores = response.getValues();
        Map<String, Object> resumen = new HashMap<>();
        List<Map<String, Object>> dias = new ArrayList<>();
        
        if (valores == null || valores.isEmpty()) {
            resumen.put("dias", dias);
            return resumen;
        }
        
        String fechaActual = null;
        double totalDia = 0;
        int cantidadPedidos = 0;
        
        for (List<Object> fila : valores) {
            if (fila == null || fila.isEmpty()) continue;
            
            String primeraCelda = fila.get(0).toString();
            
            if (primeraCelda.startsWith("Fecha:")) {
                if (fechaActual != null) {
                    Map<String, Object> dia = new HashMap<>();
                    dia.put("fecha", fechaActual.replace("Fecha: ", "").replace("/", "-"));
                    dia.put("totalGanancias", totalDia);
                    dia.put("cantidadPedidos", cantidadPedidos);
                    dias.add(dia);
                }
                fechaActual = primeraCelda;
                totalDia = 0;
                cantidadPedidos = 0;
            } else if (primeraCelda.equals("TOTAL DEL DÍA:")) {
                if (fila.size() > 2) {
                    String totalStr = fila.get(2).toString().replace("$", "");
                    try {
                        totalDia = Double.parseDouble(totalStr);
                    } catch (NumberFormatException e) {}
                }
            } else if (!primeraCelda.equals("Producto") && !primeraCelda.isEmpty()) {
                cantidadPedidos++;
            }
        }
        
        if (fechaActual != null) {
            Map<String, Object> dia = new HashMap<>();
            dia.put("fecha", fechaActual.replace("Fecha: ", "").replace("/", "-"));
            dia.put("totalGanancias", totalDia);
            dia.put("cantidadPedidos", cantidadPedidos);
            dias.add(dia);
        }
        
        resumen.put("dias", dias);
        return resumen;
    }

    public String getUrlHoja() {
        return "https://docs.google.com/spreadsheets/d/" + spreadsheetId;
    }
    
    public boolean isAutorizado() {
        return autorizado;
    }
}