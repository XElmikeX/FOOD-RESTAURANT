package com.uns.siiga2.__web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;


@Controller
public class PortalController {

    @GetMapping("/")
    public String inicio(){
        return "inicio";
    }

    @GetMapping("/Rol/Cocinero")
    public String apartadoCocinero(){
        return "Cocinero";
    }

    @GetMapping("/Rol/Mozo")
    public String apartadoMozo(){
        return "Mozo";
    }
    
}
