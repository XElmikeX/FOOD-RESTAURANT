package com.uns.siiga2.__web;

import java.io.IOException;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Iniciador {
    public void main (String[] args)throws IOException{
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
