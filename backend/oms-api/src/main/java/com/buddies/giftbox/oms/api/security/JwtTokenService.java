package com.buddies.giftbox.oms.api.security;

import com.buddies.giftbox.oms.domain.auth.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

@Service
public class JwtTokenService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtTokenService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(decodeBase64(props.getSecret()));
    }

    public String generateToken(Long userId, String email, Set<Role> roles) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds((long) props.getExpirationMinutes() * 60L);

        return Jwts.builder()
                .issuer(props.getIssuer())
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("email", email)
                .claim("roles", roles == null ? new String[0] : roles.stream().map(Enum::name).toArray(String[]::new))
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

        Object rawRoles = c.get("roles");
        Set<Role> roles = new HashSet<Role>();

        if (rawRoles instanceof java.util.List) {
            java.util.List list = (java.util.List) rawRoles;
            for (Object o : list) {
                if (o != null) {
                    roles.add(Role.valueOf(String.valueOf(o)));
                }
            }
        } else if (rawRoles instanceof String[]) {
            String[] arr = (String[]) rawRoles;
            for (String r : arr) {
                if (r != null) {
                    roles.add(Role.valueOf(r));
                }
            }
        }

        return new AuthPrincipal(userId, email, roles);
    }

    private static byte[] decodeBase64(String secret) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("JWT secret is missing. Set security.jwt.secret (JWT_SECRET).");
        }
        try {
            return Base64.getDecoder().decode(secret.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT secret must be Base64 encoded (security.jwt.secret).", e);
        }
    }
}
