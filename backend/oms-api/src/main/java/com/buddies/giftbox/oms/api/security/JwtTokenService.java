package com.buddies.giftbox.oms.api.security;

import com.buddies.giftbox.oms.application.security.TokenService;
import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Set;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService implements TokenService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtTokenService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(resolveSecret(props.getSecret()));
    }

    @Override
    public String createAccessToken(User user, long expiresInSeconds) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expiresInSeconds);

        Set<Role> rolesValue = user.getRoles() == null ? Set.of() : user.getRoles();
        Set<String> roles = rolesValue.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        Set<String> permissions = rolesValue.stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(Permission::getCode)
                .collect(Collectors.toSet());
        Set<Permission> directPermissions = user.getPermissions() == null ? Set.of() : user.getPermissions();
        permissions.addAll(directPermissions.stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet()));

        return Jwts.builder()
                .issuer(props.getIssuer())
                .subject(String.valueOf(user.getId()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("email", user.getEmail())
                .claim("fullName", user.getFullName())
                .claim("roles", roles)
                .claim("permissions", permissions)
                .signWith(key)
                .compact();
    }

    public AuthPrincipal parseAndValidate(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(props.getIssuer())
                .build()
                .parseSignedClaims(token);

        Claims claims = jws.getPayload();
        Long userId = Long.valueOf(claims.getSubject());
        String email = claims.get("email", String.class);
        String fullName = claims.get("fullName", String.class);

        Set<String> roles = extractSet(claims.get("roles"));
        Set<String> permissions = extractSet(claims.get("permissions"));

        return AuthPrincipal.builder()
                .userId(userId)
                .email(email)
                .fullName(fullName)
                .roles(roles == null ? Set.of() : roles)
                .permissions(permissions == null ? Set.of() : permissions)
                .build();
    }

    private byte[] resolveSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret is missing. Set security.jwt.secret (JWT_SECRET).");
        }
        String trimmed = secret.trim();
        byte[] decoded = tryDecodeBase64(trimmed);
        if (decoded != null && decoded.length >= 32) {
            return decoded;
        }

        byte[] rawBytes = trimmed.getBytes(StandardCharsets.UTF_8);
        validateLength(rawBytes.length, false);
        return rawBytes;
    }

    private byte[] tryDecodeBase64(String secret) {
        try {
            return Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void validateLength(int length, boolean base64) {
        if (length < 32) {
            String format = base64 ? "Base64" : "plain text";
            throw new IllegalStateException(
                    "JWT secret is too short for HMAC-SHA. Provide a " + format
                            + " secret of at least 32 bytes (256 bits).");
        }
    }

    private Set<String> extractSet(Object value) {
        if (value instanceof Iterable<?> iterable) {
            return java.util.stream.StreamSupport.stream(iterable.spliterator(), false)
                    .map(String::valueOf)
                    .collect(Collectors.toSet());
        }
        if (value instanceof String str) {
            return Set.of(str);
        }
        return Set.of();
    }
}
