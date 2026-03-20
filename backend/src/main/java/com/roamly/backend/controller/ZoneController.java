package com.roamly.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*") // Allows mobile app / local frontend to communicate with localhost
public class ZoneController {
    
    // Example endpoint to check GPS
    @PostMapping("/check-location")
    public String checkLocation(@RequestParam double latitude, @RequestParam double longitude) {
        // Dummy logic: determine if user is inside a restricted zone
        if (latitude == 25.2048 && longitude == 55.2708) {
            return "Alert! Inside Restricted Zone.";
        }
        return "Safe Zone";
    }
}
