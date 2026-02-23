package com.uns.food.MeseroACocinero;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MesasRepository extends JpaRepository<Mesas, Long> {
    Optional<Mesas> findById(Long id);
    List<Mesas> findByMesa(String mesa);

    List<Mesas> findByPendienteTrue();
    List<Mesas> findByPendienteFalse();
}
