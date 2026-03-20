package com.roamly.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class TipRequest {
    @NotBlank(message = "Query cannot be empty")
    private String query;
    private String language = "English";
    private String profile = "General Traveler";
    private String sessionId = "default";

    public TipRequest() {
    }

    public TipRequest(String query, String language, String profile, String sessionId) {
        this.query = query;
        this.language = language;
        this.profile = profile;
        this.sessionId = sessionId;
    }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getProfile() { return profile; }
    public void setProfile(String profile) { this.profile = profile; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}
