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
    //la id de la hoja de google sheet api
    private static final String SPREADSHEET_ID = "13fWsFYrAuHF3-_s5mQoyX1qm8rVGdzMRyqmz4zp39wM";
    private static final String CREDENTIALS_FILE_PATH = "/credentials.json";
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    
    private Sheets sheetsService;
    private boolean autorizado = false;
    private Integer sheetIdVentas = null; // Guardamos el ID de la hoja

    @PostConstruct
    public void init() {
        try {
            this.sheetsService = getSheetsService();
            this.autorizado = true;
            System.out.println("✅ Google Sheets Service inicializado correctamente");
            System.out.println("📁 Los tokens se guardan en: " + new File(TOKENS_DIRECTORY_PATH).getAbsolutePath());
            
            // Obtener el ID de la hoja "Ventas" y guardarlo
            obtenerSheetIdVentas();
            
            // Inicializar la hoja si es necesario
            inicializarHoja();
            
        } catch (Exception e) {
            this.autorizado = false;
            System.err.println("❌ Error al inicializar Google Sheets: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private Sheets getSheetsService() throws IOException, GeneralSecurityException {
        InputStream in = GoogleSheetsService.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
        if (in == null) {
            throw new FileNotFoundException("No se encontró el archivo: " + CREDENTIALS_FILE_PATH);
        }
        
        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
            JacksonFactory.getDefaultInstance(), 
            new InputStreamReader(in)
        );

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

    /**
     * Obtiene y guarda el ID de la hoja "Ventas"
     */
    private void obtenerSheetIdVentas() throws IOException {
        Spreadsheet spreadsheet = sheetsService.spreadsheets().get(SPREADSHEET_ID).execute();
        
        for (Sheet sheet : spreadsheet.getSheets()) {
            if (sheet.getProperties().getTitle().equals("Ventas")) {
                sheetIdVentas = sheet.getProperties().getSheetId();
                System.out.println("📊 ID de hoja 'Ventas': " + sheetIdVentas);
                break;
            }
        }
    }

    private void inicializarHoja() throws IOException {
        // Verificar si la hoja existe
        Spreadsheet spreadsheet = sheetsService.spreadsheets().get(SPREADSHEET_ID).execute();
        
        // Buscar o crear hoja "Ventas"
        Sheet ventasSheet = null;
        for (Sheet sheet : spreadsheet.getSheets()) {
            if (sheet.getProperties().getTitle().equals("Ventas")) {
                ventasSheet = sheet;
                break;
            }
        }
        
        if (ventasSheet == null) {
            // Crear nueva hoja llamada "Ventas"
            List<Request> requests = new ArrayList<>();
            requests.add(new Request().setAddSheet(
                new AddSheetRequest().setProperties(
                    new SheetProperties().setTitle("Ventas"))));
            
            BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest()
                .setRequests(requests);
            
            sheetsService.spreadsheets().batchUpdate(SPREADSHEET_ID, batchRequest).execute();
            
            // Después de crear, obtener el nuevo sheetId
            obtenerSheetIdVentas();
        }
    }

    public void guardarFactura(Long mesaId, List<PortalController.PedidoFacturaDTO> pedidos) throws IOException {
        if (!autorizado) {
            throw new IOException("Google Sheets no está autorizado. Revisa los logs.");
        }

        // Asegurarnos de que tenemos el sheetId
        if (sheetIdVentas == null) {
            obtenerSheetIdVentas();
        }

        LocalDateTime ahora = LocalDateTime.now();
        String fecha = ahora.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String fechaCabecera = "Fecha: " + fecha;
        String horaActual = ahora.format(DateTimeFormatter.ofPattern("HH:mm"));
        
        // 1. Obtener TODOS los datos actuales de la hoja
        String range = "Ventas!A:D";
        ValueRange response = sheetsService.spreadsheets().values()
            .get(SPREADSHEET_ID, range)
            .execute();
        
        List<List<Object>> valoresExistentes = response.getValues();
        
        // 2. Buscar si ya existe un bloque para esta fecha
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
            // ===== CASO 1: NO existe bloque para esta fecha =====
            crearNuevoBloque(fechaCabecera, horaActual, pedidos, valoresExistentes);
        } else {
            // ===== CASO 2: YA existe bloque =====
            agregarABloqueExistente(fecha, fechaCabecera, horaActual, pedidos, 
                                   valoresExistentes, filaFechaExistente, filaTotalExistente);
        }
    }

    /**
     * Crea un nuevo bloque para un día que no existe
     */
    private void crearNuevoBloque(String fechaCabecera, String horaActual, 
                                  List<PortalController.PedidoFacturaDTO> pedidos,
                                  List<List<Object>> valoresExistentes) throws IOException {
        
        List<List<Object>> valores = new ArrayList<>();
        
        int filaInicio = (valoresExistentes != null ? valoresExistentes.size() : 0);
        
        if (filaInicio > 0) {
            valores.add(Arrays.asList("")); // Fila vacía como separador
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
            .append(SPREADSHEET_ID, insertRange, body)
            .setValueInputOption("USER_ENTERED")
            .setInsertDataOption("INSERT_ROWS")
            .execute();
            
        System.out.println("✅ Nuevo bloque creado para el día " + fechaCabecera);
    }

    /**
     * Agrega productos a un bloque existente
     */
    private void agregarABloqueExistente(String fecha, String fechaCabecera, String horaActual,
                                        List<PortalController.PedidoFacturaDTO> pedidos,
                                        List<List<Object>> valoresExistentes,
                                        int filaFechaExistente, int filaTotalExistente) throws IOException {
        
        // 1. ELIMINAR el TOTAL existente usando el sheetId correcto
        List<Request> deleteRequests = new ArrayList<>();
        deleteRequests.add(new Request().setDeleteDimension(
            new DeleteDimensionRequest()
                .setRange(new DimensionRange()
                    .setSheetId(sheetIdVentas)  // ← Usamos el ID dinámico
                    .setDimension("ROWS")
                    .setStartIndex(filaTotalExistente)
                    .setEndIndex(filaTotalExistente + 1))));
        
        BatchUpdateSpreadsheetRequest deleteBatchRequest = new BatchUpdateSpreadsheetRequest()
            .setRequests(deleteRequests);
        
        sheetsService.spreadsheets().batchUpdate(SPREADSHEET_ID, deleteBatchRequest).execute();
        
        // 2. Obtener datos actualizados después del DELETE
        ValueRange updatedResponse = sheetsService.spreadsheets().values()
            .get(SPREADSHEET_ID, "Ventas!A:D")
            .execute();
        
        List<List<Object>> valoresActualizados = updatedResponse.getValues();
        
        // 3. Encontrar el final de los productos de este día
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
        
        // 4. Calcular total de productos existentes
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
        
        // 5. Preparar nuevos productos
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
        
        // 6. Insertar nuevos productos
        String insertRange = "Ventas!A" + (finalProductos + 1);
        ValueRange body = new ValueRange().setValues(nuevosProductos);
        
        sheetsService.spreadsheets().values()
            .append(SPREADSHEET_ID, insertRange, body)
            .setValueInputOption("USER_ENTERED")
            .setInsertDataOption("INSERT_ROWS")
            .execute();
        
        // 7. Insertar nuevo TOTAL
        double totalActualizado = totalExistente + totalNuevos;
        int nuevaPosicionTotal = finalProductos + nuevosProductos.size();
        
        List<List<Object>> totalData = new ArrayList<>();
        totalData.add(Arrays.asList("TOTAL DEL DÍA:", "", "$" + String.format("%.2f", totalActualizado), ""));
        
        String totalInsertRange = "Ventas!A" + (nuevaPosicionTotal + 1);
        ValueRange totalBody = new ValueRange().setValues(totalData);
        
        sheetsService.spreadsheets().values()
            .append(SPREADSHEET_ID, totalInsertRange, totalBody)
            .setValueInputOption("USER_ENTERED")
            .setInsertDataOption("INSERT_ROWS")
            .execute();
        
        System.out.println("✅ Productos agregados a bloque existente del día " + fecha);
        System.out.println("   Total actualizado: $" + String.format("%.2f", totalActualizado));
    }

    public Map<String, Object> obtenerResumenDiario() throws IOException {
        String range = "Ventas!A:D";
        ValueRange response = sheetsService.spreadsheets().values()
            .get(SPREADSHEET_ID, range)
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
        return "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID;
    }
    
    public boolean isAutorizado() {
        return autorizado;
    }
}