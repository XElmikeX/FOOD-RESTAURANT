package com.uns.food.MeseroACocinero;

import java.time.LocalDateTime;
import java.time.ZoneId;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

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
    
    // CAMPO PARA ESTADO DEL PEDIDO
    private String estado; // "pendiente", "proceso", "listo"
    
    // 🔥 NUEVO CAMPO: Indica si el cocinero ya interactuó con este pedido
    private Boolean cocineroInteractuo = false; // false por defecto
    
    // Campos para facturación
    private Double precioUnitario;
    private Double precioTotal;
    
    // Constructores
    public Pedidos() {
        this.estado = "pendiente";
        this.cocineroInteractuo = false;
    }
    
    public Pedidos(Foods comida, int cantidad, String nota, Mesas mesa) {
        this.comida = comida;
        this.cantidad = cantidad;
        this.nota = nota;
        this.mesa = mesa;
        this.estado = "pendiente";
        this.cocineroInteractuo = false;
        if (comida != null) {
            this.precioUnitario = comida.getPrecio();
            this.precioTotal = comida.getPrecio() * cantidad;
        }
    }
    
    @PrePersist
    protected void onCreate() {
        if (hora == null) {
            hora = LocalDateTime.now(ZoneId.of("America/Lima")); // Cambia a tu zona
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        if (completado && horaCompletado == null) {
            horaCompletado = LocalDateTime.now(ZoneId.of("America/Lima")); // Cambia a tu zona
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
            this.precioTotal = this.precioUnitario * this.cantidad;
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
    
    // 🔥 AGREGAR ESTE MÉTODO SETTER PARA HORA
    public void setHora(LocalDateTime hora) {
        this.hora = hora;
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
        if (completado && horaCompletado == null) {
            this.horaCompletado = LocalDateTime.now(ZoneId.of("America/Lima")); // Cambia a tu zona
        }
    }
    
    // Getter y Setter para ESTADO
    public String getEstado() {
        return estado;
    }
    
    public void setEstado(String estado) {
        this.estado = estado;
    }
    
    public Boolean getCocineroInteractuo() {
        return cocineroInteractuo;
    }
    
    public void setCocineroInteractuo(Boolean cocineroInteractuo) {
        this.cocineroInteractuo = cocineroInteractuo;
    }
    
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