package com.uns.siiga2.__web;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Pedidos {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private foods comida;

    @CreationTimestamp
    private LocalDateTime Hora;

    public Long getId(){
        return id;
    }
    public void setId(Long id){
        this.id = id;
    }

    public foods getComida(){
        return comida;
    }
    public void setNombreDelPedido(foods comida){
        this.comida = comida;
    }

    public LocalDateTime getHora(){
        return Hora;
    }
}
