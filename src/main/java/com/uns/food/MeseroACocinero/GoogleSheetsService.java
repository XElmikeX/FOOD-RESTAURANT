package com.uns.food.MeseroACocinero;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.*;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
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
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    
    @Value("${google.spreadsheet.id:13fWsFYrAuHF3-_s5mQoyX1qm8rVGdzMRyqmz4zp39wM}")
    private String spreadsheetId;
    
    @Value("${google.service.account.enabled:false}")
    private boolean useServiceAccount;
    
    private Sheets sheetsService;
    private boolean autorizado = false;
    private Integer sheetIdVentas = null;
    private String errorMessage = "";

    @PostConstruct
    public void init() {
        try {
            if (useServiceAccount) {
                inicializarConServiceAccount();
            } else {
                inicializarConOAuth();
            }
            
            if (autorizado) {
                System.out.println("✅ Google Sheets Service inicializado correctamente");
                obtenerSheetIdVentas();
                inicializarHoja();
            }
        } catch (Exception e) {
            this.autorizado = false;
            this.errorMessage = e.getMessage();
            System.err.println("❌ Error al inicializar Google Sheets: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void inicializarConServiceAccount() throws IOException, GeneralSecurityException {
        try {
            // Intentar cargar desde classpath (para producción)
            InputStream serviceAccountStream = getClass().getResourceAsStream("/service-account.json");
            
            // Si no encuentra, intentar desde variable de entorno (Railway)
            if (serviceAccountStream == null) {
                String serviceAccountJson = System.getenv("GOOGLE_SERVICE_ACCOUNT_JSON");
                if (serviceAccountJson != null && !serviceAccountJson.isEmpty()) {
                    serviceAccountStream = new ByteArrayInputStream(serviceAccountJson.getBytes());
                }
            }
            
            if (serviceAccountStream == null) {
                throw new FileNotFoundException("No se encontró service-account.json ni variable GOOGLE_SERVICE_ACCOUNT_JSON");
            }
            
            GoogleCredentials credentials = ServiceAccountCredentials.fromStream(serviceAccountStream)
                    .createScoped(Collections.singleton(SheetsScopes.SPREADSHEETS));
            
            HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);
            
            sheetsService = new Sheets.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JSON_FACTORY,
                    requestInitializer)
                    .setApplicationName(APPLICATION_NAME)
                    .build();
            
            this.autorizado = true;
            System.out.println("✅ Autenticación con Service Account exitosa");
            
        } catch (Exception e) {
            System.err.println("❌ Error con Service Account: " + e.getMessage());
            throw e;
        }
    }

    @Value("${google.client.id:#{null}}")
    private String clientId;

    @Value("${google.client.secret:#{null}}")
    private String clientSecret;

    private void inicializarConOAuth() throws IOException, GeneralSecurityException {
    // Obtener credenciales desde variables de entorno
    String clientId = System.getenv("GOOGLE_CLIENT_ID");
    String clientSecret = System.getenv("GOOGLE_CLIENT_SECRET");
    
    if (clientId == null || clientSecret == null) {
        // Intentar desde properties como fallback
        clientId = this.clientId;
        clientSecret = this.clientSecret;
    }
    
    if (clientId == null || clientSecret == null) {
        throw new IOException("No se encontraron credenciales OAuth. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno");
    }
    
    // Construir client secrets desde variables
    com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets clientSecrets = 
        new com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets();
    
    // Crear el objeto de detalles de la aplicación web
    com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets.Details details = 
        new com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets.Details();
    details.setClientId(clientId);
    details.setClientSecret(clientSecret);
    details.setRedirectUris(Collections.singletonList("http://localhost:8888/Callback"));
    
    clientSecrets.setWeb(details);
    
    List<String> scopes = Collections.singletonList(SheetsScopes.SPREADSHEETS);
    
    com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow flow = 
        new com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            JSON_FACTORY,
            clientSecrets,
            scopes)
            .setDataStoreFactory(new com.google.api.client.util.store.FileDataStoreFactory(
                new File(System.getProperty("java.io.tmpdir") + "/tokens")))
            .setAccessType("offline")
            .build();
    
    com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp receiver = 
        new com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp(
            flow, 
            new com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver.Builder()
                .setPort(8888)
                .build());
    
    com.google.api.client.auth.oauth2.Credential credential = receiver.authorize("user");
    
    sheetsService = new Sheets.Builder(
        GoogleNetHttpTransport.newTrustedTransport(),
        JSON_FACTORY,
        credential)
        .setApplicationName(APPLICATION_NAME)
        .build();
    
    this.autorizado = true;
    System.out.println("✅ Autenticación OAuth exitosa usando variables de entorno");
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
            throw new IOException("Google Sheets no está autorizado: " + errorMessage);
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
        for (int i = nuevaFilaFecha + 2; i < finalProductos; i++) {
            List<Object> fila = valoresActualizados.get(i);
            if (fila != null && fila.size() > 2 && fila.get(2) != null) {
                String totalStr = fila.get(2).toString().replace("$", "");
                try {
                    totalExistente += Double.parseDouble(totalStr);
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