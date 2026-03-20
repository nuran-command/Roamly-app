package com.roamly.backend.controller;

import com.roamly.backend.model.User;
import com.roamly.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/fcm-token")
    public String updateFcmToken(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = request.get("token");

        if (email == null || token == null) return "Missing data";

        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;
        if (userOpt.isPresent()) {
            user = userOpt.get();
        } else {
            // Auto-create for demo/testing until we have real login
            user = new User(email, "Explorer", false);
        }
        
        user.setFcmToken(token);
        userRepository.save(user);
        return "Token updated";
    }
}
