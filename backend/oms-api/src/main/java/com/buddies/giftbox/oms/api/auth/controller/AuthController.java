package com.buddies.giftbox.oms.api.auth.controller;

import com.buddies.giftbox.oms.api.auth.dto.AuthResponse;
import com.buddies.giftbox.oms.api.auth.dto.LoginRequest;
import com.buddies.giftbox.oms.api.auth.dto.MeResponse;
import com.buddies.giftbox.oms.api.auth.dto.RegisterRequest;
import com.buddies.giftbox.oms.api.auth.dto.TokenResponse;
import com.buddies.giftbox.oms.api.auth.dto.UserResponse;
import com.buddies.giftbox.oms.api.security.AuthPrincipal;
import com.buddies.giftbox.oms.application.auth.AuthService;
import com.buddies.giftbox.oms.application.auth.AuthTokens;
import com.buddies.giftbox.oms.application.auth.AuthUserView;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";

    private final AuthService authService;
    private final boolean cookieSecure;

    public AuthController(AuthService authService,
                          @Value("${app.security.cookie.secure:false}") boolean cookieSecure) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletResponse response) {
        var result = authService.login(com.buddies.giftbox.oms.application.auth.LoginRequest.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .build());

        setRefreshCookie(response, result.getTokens());

        return ResponseEntity.ok(toAuthResponse(result));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletResponse response) {
        var result = authService.register(com.buddies.giftbox.oms.application.auth.RegisterRequest.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .fullName(request.getFullName())
                .build());

        setRefreshCookie(response, result.getTokens());

        return ResponseEntity.ok(toAuthResponse(result));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request,
                                                HttpServletResponse response) {
        String refreshToken = extractRefreshToken(request)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token missing"));

        var result = authService.refresh(refreshToken);
        setRefreshCookie(response, result.getTokens());
        return ResponseEntity.ok(toAuthResponse(result));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        extractRefreshToken(request).ifPresent(authService::logout);
        clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
        UserResponse user = UserResponse.builder()
                .id(principal.getUserId())
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .enabled(true)
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .build();

        return ResponseEntity.ok(MeResponse.builder().user(user).build());
    }

    private AuthResponse toAuthResponse(com.buddies.giftbox.oms.application.auth.AuthResponse result) {
        AuthUserView view = result.getUser();
        UserResponse user = UserResponse.builder()
                .id(view.getId())
                .email(view.getEmail())
                .fullName(view.getFullName())
                .enabled(view.isEnabled())
                .roles(view.getRoles())
                .permissions(view.getPermissions())
                .build();

        AuthTokens tokens = result.getTokens();
        TokenResponse token = TokenResponse.builder()
                .accessToken(tokens.getAccessToken())
                .expiresIn(tokens.getExpiresInSeconds())
                .build();

        return AuthResponse.builder()
                .user(user)
                .token(token)
                .build();
    }

    private void setRefreshCookie(HttpServletResponse response, AuthTokens tokens) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, tokens.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/auth")
                .sameSite("Lax")
                .maxAge(tokens.getRefreshTokenExpiresInSeconds())
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/auth")
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private Optional<String> extractRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(cookie -> REFRESH_COOKIE.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}
