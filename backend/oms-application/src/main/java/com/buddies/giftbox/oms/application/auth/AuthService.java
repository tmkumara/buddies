package com.buddies.giftbox.oms.application.auth;

import com.buddies.giftbox.oms.application.security.PasswordHasher;
import com.buddies.giftbox.oms.application.security.TokenService;
import com.buddies.giftbox.oms.domain.auth.RefreshToken;
import com.buddies.giftbox.oms.domain.auth.RefreshTokenRepository;
import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.RoleRepository;
import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordHasher passwordHasher;
    private final TokenService tokenService;
    private final Clock clock;
    private final AuthTokenConfig tokenConfig;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (email == null || request.getPassword() == null) {
            throw new AuthException("Invalid credentials");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("Invalid credentials"));

        if (!user.isEnabled()) {
            throw new AuthException("User is disabled");
        }

        if (!passwordHasher.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AuthException("Invalid credentials");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (email == null || request.getPassword() == null) {
            throw new AuthException("Email and password are required");
        }
        if (userRepository.existsByEmail(email)) {
            throw new AuthException("Email already registered");
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new AuthException("Default role USER is missing"));

        User newUser = User.builder()
                .email(email)
                .passwordHash(passwordHasher.hash(request.getPassword()))
                .fullName(request.getFullName())
                .enabled(true)
                .role(userRole)
                .build();

        User saved = userRepository.save(newUser);
        return createAuthResponse(saved);
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthException("Refresh token is required");
        }

        String hash = hashToken(refreshToken);
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new AuthException("Refresh token is invalid"));

        Instant now = clock.instant();
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw new AuthException("Refresh token is expired");
        }

        refreshTokenRepository.revokeToken(token.getId(), now);

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new AuthException("User not found"));
        if (!user.isEnabled()) {
            throw new AuthException("User is disabled");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        String hash = hashToken(refreshToken);
        refreshTokenRepository.findByTokenHash(hash)
                .ifPresent(token -> refreshTokenRepository.revokeToken(token.getId(), clock.instant()));
    }

    private AuthResponse createAuthResponse(User user) {
        long accessTtlSeconds = tokenConfig.getAccessTokenTtl().toSeconds();
        long refreshTtlSeconds = tokenConfig.getRefreshTokenTtl().toSeconds();
        String accessToken = tokenService.createAccessToken(user, accessTtlSeconds);
        String refreshToken = generateRefreshToken();

        Instant now = clock.instant();
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashToken(refreshToken))
                .expiresAt(now.plus(tokenConfig.getRefreshTokenTtl()))
                .build());

        AuthTokens tokens = AuthTokens.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresInSeconds(accessTtlSeconds)
                .refreshTokenExpiresInSeconds(refreshTtlSeconds)
                .build();

        return AuthResponse.builder()
                .user(toAuthUserView(user))
                .tokens(tokens)
                .build();
    }

    private AuthUserView toAuthUserView(User user) {
        Set<Role> rolesValue = user.getRoles() == null ? Set.of() : user.getRoles();
        Set<String> roles = rolesValue.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        Set<String> permissions = rolesValue.stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getCode())
                .collect(Collectors.toSet());
        Set<com.buddies.giftbox.oms.domain.auth.Permission> directPermissions = user.getPermissions() == null
                ? Set.of()
                : user.getPermissions();
        permissions.addAll(directPermissions.stream()
                .map(permission -> permission.getCode())
                .collect(Collectors.toSet()));

        return AuthUserView.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .enabled(user.isEnabled())
                .roles(roles)
                .permissions(permissions)
                .build();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        return trimmed.isBlank() ? null : trimmed;
    }

    private String generateRefreshToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (Exception ex) {
            throw new AuthException("Unable to hash refresh token");
        }
    }
}
