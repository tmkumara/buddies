package com.buddies.giftbox.oms.api.auth.dto;

public class MeResponse {
    private final UserResponse user;

    public MeResponse(UserResponse user) {
        this.user = user;
    }

    public UserResponse getUser() {
        return user;
    }
}
