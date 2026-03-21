package com.roamly.backend.service;

import com.roamly.backend.dto.LocationRequest;
import com.roamly.backend.dto.TipRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class AIService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private FirebaseService firebaseService;
    
    @Autowired(required = false)
    private com.roamly.backend.repository.UserRepository userRepository;

    private final String PYTHON_BASE_URL = "http://localhost:8000";

    public Object getCulturalTip(TipRequest request) {
        String url = PYTHON_BASE_URL + "/cultural-tip";
        return restTemplate.postForObject(url, request, Object.class);
    }

    public Object safetyCheck(LocationRequest request) {
        Map<String, Object> response = new HashMap<>();

        // Example Restricted Zones (Lat, Lon): UAE + KAZAKHSTAN
        double[][] restrictedZones = {
            {25.2532, 55.3657}, // Dubai International Airport
            {24.8088, 55.1542}, // Mosque Area (simulated)
            {25.2685, 55.3093}, // Metro Station (Dubai)
            {51.1261, 71.4461}, // Ak Orda Presidential Palace (Astana)
            {51.1255, 71.4705}  // Hazrat Sultan Mosque (Astana)
        };

        boolean inRestrictedZone = false;
        String currentZoneName = "Unknown";

        for (double[] zone : restrictedZones) {
            double distance = calculateDistance(request.getLat(), request.getLon(), zone[0], zone[1]);
            // If within 1 kilometer
            if (distance < 1.0) {
                inRestrictedZone = true;
                if (zone[0] == 25.2532) currentZoneName = "Dubai International Airport";
                else if (zone[0] == 24.8088) currentZoneName = "Mosque Area (UAE)";
                else if (zone[0] == 25.2685) currentZoneName = "Metro Station (UAE)";
                else if (zone[0] == 51.1261) currentZoneName = "Presidential Palace (Astana)";
                else if (zone[0] == 51.1255) currentZoneName = "Hazrat Sultan Mosque (Astana)";
                break;
            }
        }

        if (inRestrictedZone) {
            response.put("status", "RESTRICTED");
            response.put("alert", "🚨 RED ALERT! You are near " + currentZoneName + ".");
            response.put("push_notification", "True"); 

            // Trigger Real Push Notification
            if (userRepository != null) {
                for (com.roamly.backend.model.User user : userRepository.findAll()) {
                    if (user.getFcmToken() != null) {
                        firebaseService.sendPushNotification(
                            user.getFcmToken(), 
                            "🚨 ROAMLY RED ALERT", 
                            "Stay away from " + currentZoneName + "! High legal sensitivity."
                        );
                    }
                }
            }
            
            // Forward check to Python AI for specific insight
            try {
                TipRequest zoneTipRequest = new TipRequest("What are the laws and penalties at " + currentZoneName + "?", "English", "General Traveler", "sys-gen");
                Object aiTip = getCulturalTip(zoneTipRequest);
                response.put("ai_insight", aiTip);
            } catch (Exception e) {
                // Ignore AI error if script is offline
            }
        } else {
            response.put("status", "SAFE");
            response.put("alert", request.getLat() > 40 ? "Zone is Safe. General Kazakhstan rules apply." : "Zone is Safe. General UAE rules apply.");
        }

        return response;
    }

    public Object scanMenu(Map<String, Object> request) {
        String url = PYTHON_BASE_URL + "/scan-menu";
        return restTemplate.postForObject(url, request, Object.class);
    }

    // Haversine formula for distance in Kilometers
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    }
}
