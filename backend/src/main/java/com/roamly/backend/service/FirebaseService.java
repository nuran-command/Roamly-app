package com.roamly.backend.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;

@Service
public class FirebaseService {

    private boolean isInitialized = false;

    @PostConstruct
    public void initialize() {
        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(new ClassPathResource("service-account.json").getInputStream()))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
            isInitialized = true;
            System.out.println("🔥 Firebase Initialized Successfully!");
        } catch (IOException e) {
            System.err.println("⚠️ ERROR: service-account.json not found or invalid. Push notifications DISABLED.");
        }
    }

    public void sendPushNotification(String token, String title, String body) {
        if (!isInitialized) return;

        try {
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ Push Notification sent to token: " + token);
        } catch (Exception e) {
            System.err.println("❌ Error sending Push: " + e.getMessage());
        }
    }
}
