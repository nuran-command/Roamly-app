package com.roamly.backend.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.client.ResourceAccessException;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<Map<String, String>> handleAIOffline(ResourceAccessException ex) {
        return ResponseEntity.status(503).body(Map.of(
            "error", "The AI Brain is currently resting or disconnected. Please try again soon."
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralError(Exception ex) {
        return ResponseEntity.status(500).body(Map.of(
            "error", "A system error occurred: " + ex.getMessage()
        ));
    }
}
