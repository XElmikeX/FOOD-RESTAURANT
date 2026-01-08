package com.uns.siiga2.__web;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodsRepository extends JpaRepository<foods,Long>{
    Optional<foods> findById(String id);
    Optional<foods> findByNombre(String nombre);
    Optional<foods> findByPrecio(String precio);
}
