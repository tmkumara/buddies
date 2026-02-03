package com.buddies.giftbox.oms.api.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtTokenServiceTest {

    @Test
    void acceptsRawSecretWithMinLength() {
        assertDoesNotThrow(() -> JwtTokenService.resolveKeyBytes("0123456789abcdef0123456789abcdef"));
    }

    @Test
    void acceptsBase64SecretWithMinLength() {
        assertDoesNotThrow(() -> JwtTokenService.resolveKeyBytes(
                "base64:ZGV2LWp3dC1zZWNyZXQtMzItYnl0ZXMtbG9uZyEhISE="));
    }

    @Test
    void rejectsShortSecrets() {
        assertThrows(IllegalStateException.class, () -> JwtTokenService.resolveKeyBytes("short"));
    }
}
