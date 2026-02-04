package com.buddies.giftbox.oms.api.security;

import com.buddies.giftbox.oms.application.security.PasswordHasher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BcryptPasswordHasher implements PasswordHasher {

    private final PasswordEncoder encoder;

    public BcryptPasswordHasher(PasswordEncoder encoder) {
        this.encoder = encoder;
    }

    @Override
    public boolean matches(String rawPassword, String passwordHash) {
        return encoder.matches(rawPassword, passwordHash);
    }

    @Override
    public String hash(String rawPassword) {
        return encoder.encode(rawPassword);
    }
}
