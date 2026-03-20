package com.roamly.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;

    @Column(nullable = false)
    private boolean isPremium = false;

    private String fcmToken;

    // Default constructor is required by JPA
    public User() {}

    public User(String email, String name, boolean isPremium) {
        this.email = email;
        this.name = name;
        this.isPremium = isPremium;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isPremium() { return isPremium; }
    public void setPremium(boolean premium) { isPremium = premium; }

    public String getFcmToken() { return fcmToken; }
    public void setFcmToken(String fcmToken) { this.fcmToken = fcmToken; }
}
