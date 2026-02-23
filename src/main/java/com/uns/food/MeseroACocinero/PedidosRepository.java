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
    
    // Corregido: Optional no es adecuado para lista, mejor usar List
    List<Pedidos> findByMesaId(Long mesaId);
    
    Optional<Pedidos> findByComidaId(long comidaId);
    
    List<Pedidos> findByMesaIdAndCompletadoFalse(Long mesaId);
    
    // NUEVOS MÉTODOS PARA FACTURACIÓN
    
    // Buscar pedidos completados (listos para facturar)
    List<Pedidos> findByCompletadoTrue();
    
    // Buscar pedidos completados de una mesa específica
    List<Pedidos> findByMesaIdAndCompletadoTrue(Long mesaId);
    
    // Buscar pedidos completados ordenados por fecha (para estadísticas)
    List<Pedidos> findByCompletadoTrueOrderByHoraCompletadoDesc();
    
    // Buscar pedidos por rango de fechas (para estadísticas diarias/mensuales)
    List<Pedidos> findByHoraCompletadoBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
    
    // Buscar pedidos completados de una mesa en un rango de fechas
    List<Pedidos> findByMesaIdAndCompletadoTrueAndHoraCompletadoBetween(
        Long mesaId, 
        java.time.LocalDateTime start, 
        java.time.LocalDateTime end
    );
    
    // Contar pedidos completados (para estadísticas)
    long countByCompletadoTrue();
    
    // Sumar el total de ventas de pedidos completados (usando JPQL)
    @Query("SELECT SUM(p.precioTotal) FROM Pedidos p WHERE p.completado = true")
    Double sumTotalVentasCompletadas();
    
    // Sumar el total de ventas por mesa
    @Query("SELECT SUM(p.precioTotal) FROM Pedidos p WHERE p.mesa.id = :mesaId AND p.completado = true")
    Double sumTotalVentasPorMesa(@Param("mesaId") Long mesaId);
    
    // Sumar el total de ventas en un rango de fechas
    @Query("SELECT SUM(p.precioTotal) FROM Pedidos p WHERE p.completado = true AND p.horaCompletado BETWEEN :start AND :end")
    Double sumTotalVentasEnRango(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);
    
    // Obtener estadísticas por día (agrupado por fecha)
    @Query("SELECT DATE(p.horaCompletado) as fecha, COUNT(p) as cantidad, SUM(p.precioTotal) as total " +
           "FROM Pedidos p WHERE p.completado = true GROUP BY DATE(p.horaCompletado) ORDER BY fecha DESC")
    List<Object[]> obtenerEstadisticasPorDia();
    
    // Obtener estadísticas por mes
    @Query("SELECT FUNCTION('YEAR', p.horaCompletado) as anio, FUNCTION('MONTH', p.horaCompletado) as mes, " +
           "COUNT(p) as cantidad, SUM(p.precioTotal) as total " +
           "FROM Pedidos p WHERE p.completado = true GROUP BY anio, mes ORDER BY anio DESC, mes DESC")
    List<Object[]> obtenerEstadisticasPorMes();
    
    // Obtener estadísticas por año
    @Query("SELECT FUNCTION('YEAR', p.horaCompletado) as anio, COUNT(p) as cantidad, SUM(p.precioTotal) as total " +
           "FROM Pedidos p WHERE p.completado = true GROUP BY anio ORDER BY anio DESC")
    List<Object[]> obtenerEstadisticasPorAnio();
    
    // Eliminar pedidos completados de una mesa (para cuando se factura)
    void deleteByMesaIdAndCompletadoTrue(Long mesaId);
}
