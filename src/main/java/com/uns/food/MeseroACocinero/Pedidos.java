// Pedidos.java - Modificado para incluir precio y timestamp de completado
package com.uns.food.MeseroACocinero;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
    
    private int cantidad;
    private String nota;

    @ManyToOne
    private Mesas mesa;

    @CreationTimestamp
    private LocalDateTime hora;

    @UpdateTimestamp
    private LocalDateTime horaCompletado;

    private boolean completado = false;
    
    // Nuevos campos para facturación
    private Double precioUnitario;
    private Double precioTotal;
    
    // Constructores
    public Pedidos() {
    }
    
    public Pedidos(Foods comida, int cantidad, String nota, Mesas mesa) {
        this.comida = comida;
        this.cantidad = cantidad;
        this.nota = nota;
        this.mesa = mesa;
        if (comida != null) {
            this.precioUnitario = comida.getPrecio();
            this.precioTotal = comida.getPrecio() * cantidad;
        }
    }

    // Getters y Setters existentes...
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
        if (comida != null) {
            this.precioUnitario = comida.getPrecio();
            this.precioTotal = comida.getPrecio() * this.cantidad;
        }
    }

    public int getCantidad(){
        return cantidad;
    }
    public void setCantidad(int cantidad){
        this.cantidad = cantidad;
        if (this.precioUnitario != null) {
            this.precioTotal = this.precioUnitario * cantidad;
        }
    }

    public String getNota(){
        return nota;
    }
    public void setNota(String nota){
        this.nota = nota;
    }

    public Mesas getMesa(){
        return mesa;
    }
    public void setMesa(Mesas mesa){
        this.mesa = mesa;
    }

    public LocalDateTime getHora(){
        return hora;
    }
    
    public LocalDateTime getHoraCompletado() {
        return horaCompletado;
    }
    
    public void setHoraCompletado(LocalDateTime horaCompletado) {
        this.horaCompletado = horaCompletado;
    }
    
    public Boolean getCompletado(){
        return completado;
    }
    public void setCompletado(Boolean completado){
        this.completado = completado;
        if (completado) {
            this.horaCompletado = LocalDateTime.now();
        }
    }
    
    // Nuevos getters y setters
    public Double getPrecioUnitario() {
        return precioUnitario;
    }
    
    public void setPrecioUnitario(Double precioUnitario) {
        this.precioUnitario = precioUnitario;
        if (this.cantidad > 0) {
            this.precioTotal = precioUnitario * this.cantidad;
        }
    }
    
    public Double getPrecioTotal() {
        return precioTotal;
    }
    
    public void setPrecioTotal(Double precioTotal) {
        this.precioTotal = precioTotal;
    }
    
    public String getNombreProducto() {
        return comida != null ? comida.getNombre() : "Producto no disponible";
    }
}