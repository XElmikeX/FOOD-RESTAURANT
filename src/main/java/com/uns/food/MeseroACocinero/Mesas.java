package com.uns.food.MeseroACocinero;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Mesas {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String mesa;

    private Boolean pendiente = true;

    public Long getId(){
        return id;
    }
    public void setId(Long id){
        this.id = id;
    }

    public String getMesa(){
        return mesa;
    }
    public void setMesa(String mesa){
        this.mesa = mesa;
    }

    public Boolean getPendiente(){
        return pendiente;
    }
    public void setPendiente(Boolean pendiente){
        this.pendiente = pendiente;
    }
}
