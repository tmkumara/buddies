package com.buddies.giftbox.oms.api.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class JwtTokenServiceTest {

    @Test
    void rejectsShortPlainTextSecret() {
        JwtProperties props = new JwtProperties();
        props.setSecret("short-secret");

        assertThrows(IllegalStateException.class, () -> new JwtTokenService(props));
    }

    @Test
    void acceptsStrongBase64Secret() {
        JwtProperties props = new JwtProperties();
        byte[] bytes = new byte[32];
        props.setSecret(Base64.getEncoder().encodeToString(bytes));

        assertDoesNotThrow(() -> new JwtTokenService(props));
    }

    @Test
    void acceptsStrongPlainTextSecret() {
        JwtProperties props = new JwtProperties();
        props.setSecret("this-is-a-32-char-secret-value!!");

        assertDoesNotThrow(() -> new JwtTokenService(props));
    }
}
