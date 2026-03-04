// PedidosRepository.java - Agregar métodos para consultar por estado

package com.uns.food.MeseroACocinero;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PedidosRepository extends JpaRepository<Pedidos, Long> {
    
    // Métodos existentes
    List<Pedidos> findByCompletadoFalse();
    List<Pedidos> findByMesaId(Long mesaId);
    Optional<Pedidos> findByComidaId(long comidaId);
    List<Pedidos> findByMesaIdAndCompletadoFalse(Long mesaId);
    
    // NUEVOS MÉTODOS PARA CONSULTAR POR ESTADO
    List<Pedidos> findByMesaIdAndEstado(Long mesaId, String estado);
    List<Pedidos> findByMesaIdAndEstadoIn(Long mesaId, List<String> estados);
    
    // Obtener todos los pedidos activos (no completados) con su estado
    List<Pedidos> findByCompletadoFalseOrderByMesaIdAsc();
    
    // Obtener pedidos por estado específico
    List<Pedidos> findByEstadoAndCompletadoFalse(String estado);
    
    // Obtener resumen de estados por mesa
    @Query("SELECT p.mesa.id, p.estado, COUNT(p) FROM Pedidos p " +
           "WHERE p.completado = false GROUP BY p.mesa.id, p.estado")
    List<Object[]> contarPedidosPorEstadoYMesa();
    
    // Métodos existentes para facturación...
    List<Pedidos> findByCompletadoTrue();
    List<Pedidos> findByMesaIdAndCompletadoTrue(Long mesaId);
    List<Pedidos> findByCompletadoTrueOrderByHoraCompletadoDesc();
    List<Pedidos> findByHoraCompletadoBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
    List<Pedidos> findByMesaIdAndCompletadoTrueAndHoraCompletadoBetween(
        Long mesaId, 
        java.time.LocalDateTime start, 
        java.time.LocalDateTime end
    );
    long countByCompletadoTrue();
    
    @Query("SELECT SUM(p.precioTotal) FROM Pedidos p WHERE p.completado = true")
    Double sumTotalVentasCompletadas();
    
    @Query("SELECT SUM(p.precioTotal) FROM Pedidos p WHERE p.mesa.id = :mesaId AND p.completado = true")
    Double sumTotalVentasPorMesa(@Param("mesaId") Long mesaId);
    
    @Query("SELECT SUM(p.precioTotal) FROM Pedidos p WHERE p.completado = true AND p.horaCompletado BETWEEN :start AND :end")
    Double sumTotalVentasEnRango(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);
    
    @Query("SELECT DATE(p.horaCompletado) as fecha, COUNT(p) as cantidad, SUM(p.precioTotal) as total " +
           "FROM Pedidos p WHERE p.completado = true GROUP BY DATE(p.horaCompletado) ORDER BY fecha DESC")
    List<Object[]> obtenerEstadisticasPorDia();
    
    @Query("SELECT FUNCTION('YEAR', p.horaCompletado) as anio, FUNCTION('MONTH', p.horaCompletado) as mes, " +
           "COUNT(p) as cantidad, SUM(p.precioTotal) as total " +
           "FROM Pedidos p WHERE p.completado = true GROUP BY anio, mes ORDER BY anio DESC, mes DESC")
    List<Object[]> obtenerEstadisticasPorMes();
    
    @Query("SELECT FUNCTION('YEAR', p.horaCompletado) as anio, COUNT(p) as cantidad, SUM(p.precioTotal) as total " +
           "FROM Pedidos p WHERE p.completado = true GROUP BY anio ORDER BY anio DESC")
    List<Object[]> obtenerEstadisticasPorAnio();
    
    void deleteByMesaIdAndCompletadoTrue(Long mesaId);

    List<Pedidos> findByCocineroInteractuoTrueAndCompletadoFalse();
    
    // NUEVO: Buscar por mesa y si el cocinero interactuó
    List<Pedidos> findByMesaIdAndCocineroInteractuoTrueAndCompletadoFalse(Long mesaId);
    
    // NUEVO: Contar pedidos por mesa donde el cocinero interactuó, agrupado por estado
    @Query("SELECT p.mesa.id, p.estado, COUNT(p) FROM Pedidos p " +
           "WHERE p.cocineroInteractuo = true AND p.completado = false " +
           "GROUP BY p.mesa.id, p.estado")
    List<Object[]> contarPedidosPorEstadoYMesaConInteraccion();

    // 🔥 NUEVO: Contar pedidos visibles para mozo (con interacción, sin importar si están completados)
       @Query("SELECT p.mesa.id, " +
              "CASE WHEN p.completado = true THEN 'completado' ELSE p.estado END, " +
              "COUNT(p) FROM Pedidos p " +
              "WHERE p.cocineroInteractuo = true " +
              "GROUP BY p.mesa.id, " +
              "CASE WHEN p.completado = true THEN 'completado' ELSE p.estado END")
       List<Object[]> contarPedidosVisiblesParaMozo();

       // 🔥 NUEVO: Buscar pedidos visibles para mozo por mesa
       @Query("SELECT p FROM Pedidos p " +
              "WHERE p.mesa.id = :mesaId " +
              "AND p.cocineroInteractuo = true " +  // Solo los que el cocinero ha tocado
              "ORDER BY p.completado ASC, " +        // Primero los no completados
              "CASE p.estado " +                     // Luego por estado
              "   WHEN 'pendiente' THEN 1 " +
              "   WHEN 'proceso' THEN 2 " +
              "   WHEN 'listo' THEN 3 " +
              "   ELSE 4 END, " +
              "p.hora ASC")    
       List<Pedidos> findByMesaIdVisiblesParaMozo(@Param("mesaId") Long mesaId);
}