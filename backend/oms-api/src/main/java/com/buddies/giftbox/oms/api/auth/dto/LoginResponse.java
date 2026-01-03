package com.buddies.giftbox.oms.api.auth.dto;

public class LoginResponse {
    private final String token;
    private final UserResponse user;

    public LoginResponse(String token, UserResponse user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public UserResponse getUser() {
        return user;
    }
}
