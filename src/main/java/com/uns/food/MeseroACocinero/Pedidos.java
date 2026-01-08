package com.uns.food.MeseroACocinero;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
public class Pedidos {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Foods comida;

    @ManyToOne
    private Mesas mesa;

    @CreationTimestamp
    private LocalDateTime Hora;


    public Pedidos() {
        // Constructor vacío requerido por JPA
    }
    public Pedidos(Foods comida) {
        this.comida = comida;
        this.Hora = LocalDateTime.now();
    }

    public Long getId(){
        return id;
    }
    public void setId(Long id){
        this.id = id;
    }

    public Foods getComida(){
        return comida;
    }
    public void setComida(Foods comida){
        this.comida = comida;
    }

    public Mesas getMesa(){
        return mesa;
    }
    public void setMesa(Mesas mesa){
        this.mesa = mesa;
    }

    public LocalDateTime getHora(){
        return Hora;
    }
}
