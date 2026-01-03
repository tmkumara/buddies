package com.buddies.giftbox.oms.application.auth;

public final class LoginResult {
    private final AuthUserView user;

    public LoginResult(AuthUserView user) {
        this.user = user;
    }

    public AuthUserView user() {
        return user;
    }
}
