package com.buddies.giftbox.oms.api.auth.controller;

import com.buddies.giftbox.oms.api.auth.dto.LoginRequest;
import com.buddies.giftbox.oms.api.auth.dto.LoginResponse;
import com.buddies.giftbox.oms.api.auth.dto.MeResponse;
import com.buddies.giftbox.oms.api.auth.dto.UserResponse;
import com.buddies.giftbox.oms.api.security.AuthPrincipal;
import com.buddies.giftbox.oms.api.security.JwtTokenService;
import com.buddies.giftbox.oms.application.auth.AuthService;
import com.buddies.giftbox.oms.application.auth.LoginCommand;
import com.buddies.giftbox.oms.application.auth.LoginResult;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtTokenService jwt;

    public AuthController(AuthService authService, JwtTokenService jwt) {
        this.authService = authService;
        this.jwt = jwt;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {

        LoginResult result = authService.login(new LoginCommand(req.getEmail(), req.getPassword()));

        Long userId = result.user().id() == null ? null : result.user().id().value();
        String token = jwt.generateToken(userId, result.user().email());

        UserResponse user = new UserResponse(userId, result.user().email(), result.user().roles());
        return ResponseEntity.ok(new LoginResponse(token, user));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {

        // We set AuthPrincipal as the principal in JwtAuthenticationFilter
        AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();

        UserResponse user = new UserResponse(
                principal.userId(),
                principal.email(),
                principal.roles()
        );

        return ResponseEntity.ok(new MeResponse(user));
    }
}
