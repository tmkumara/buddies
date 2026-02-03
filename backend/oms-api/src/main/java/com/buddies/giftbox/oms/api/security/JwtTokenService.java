package com.buddies.giftbox.oms.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtTokenService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtTokenService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(resolveKeyBytes(props.getSecret()));
    }

    public String generateToken(Long userId, String email) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds((long) props.getExpirationMinutes() * 60L);

        return Jwts.builder()
                .issuer(props.getIssuer())
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("email", email)
                .signWith(key)
                .compact();
    }

    public AuthPrincipal parseAndValidate(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(props.getIssuer())
                .build()
                .parseSignedClaims(token);

        Claims c = jws.getPayload();

        Long userId = Long.valueOf(c.getSubject());
        String email = c.get("email", String.class);

        return new AuthPrincipal(userId, email, java.util.Collections.emptySet());
    }

    static byte[] resolveKeyBytes(String secret) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("JWT secret is missing. Set security.jwt.secret (JWT_SECRET).");
        }

        String normalized = secret.trim();
        byte[] keyBytes;

        if (normalized.startsWith("base64:")) {
            String encoded = normalized.substring("base64:".length()).trim();
            try {
                keyBytes = Base64.getDecoder().decode(encoded);
            } catch (IllegalArgumentException e) {
                throw new IllegalStateException("JWT secret base64 value is invalid. Expected base64:<value>.", e);
            }
        } else {
            keyBytes = normalized.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT secret is too short for HS256 (min 32 bytes). " +
                            "Provide a longer raw string or use base64:<32+ byte secret>.");
        }

        return keyBytes;
    }
}
