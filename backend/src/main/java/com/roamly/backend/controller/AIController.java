package com.roamly.backend.controller;

import com.roamly.backend.dto.LocationRequest;
import com.roamly.backend.dto.TipRequest;
import com.roamly.backend.service.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    @Autowired
    private AIService aiService;

    @PostMapping("/cultural-tip")
    public Object getTip(@RequestBody TipRequest request) {
        return aiService.getCulturalTip(request);
    }

    @PostMapping("/safety-check")
    public Object checkSafety(@RequestBody LocationRequest request) {
        return aiService.safetyCheck(request);
    }

    @PostMapping("/scan-menu")
    public Object scanMenu(@RequestBody Map<String, Object> request) {
        return aiService.scanMenu(request);
    }
}
