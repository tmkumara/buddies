package com.buddies.giftbox.oms.application.security;

public interface PasswordHasher {
    boolean matches(String rawPassword, String passwordHash);
}
