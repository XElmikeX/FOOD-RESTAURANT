package com.uns.food.MeseroACocinero;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodsRepository extends JpaRepository<Foods,Long>{
    Optional<Foods> findByNombre(String nombre);
    Optional<Foods> findByPrecio(Double precio);
}
