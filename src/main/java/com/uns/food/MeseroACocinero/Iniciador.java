package com.uns.food.MeseroACocinero;

import java.io.IOException;
import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class Iniciador {
    
    @PostConstruct
    public void init() {
        // Establecer zona horaria por defecto para toda la aplicación
        TimeZone.setDefault(TimeZone.getTimeZone("America/Lima")); // Cambia a tu zona horaria
    }
    
    public static void main (String[] args)throws IOException{
        try{
            System.out.println("-----INICIANDO-----");
            SpringApplication.run(Iniciador.class,args);
            System.out.println("-----DESPLEGADO-----");
        }catch (Exception e){
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}
