package com.buddies.giftbox.oms.application.auth;

public final class LoginCommand {
    private final String email;
    private final String password;

    public LoginCommand(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String email() {
        return email;
    }

    public String password() {
        return password;
    }
}
