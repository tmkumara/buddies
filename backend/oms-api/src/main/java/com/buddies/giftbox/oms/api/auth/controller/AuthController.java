package com.buddies.giftbox.oms.api.auth.controller;

import com.buddies.giftbox.oms.api.auth.dto.LoginRequest;
import com.buddies.giftbox.oms.api.auth.dto.LoginResponse;
import com.buddies.giftbox.oms.api.auth.dto.MeResponse;
import com.buddies.giftbox.oms.api.auth.dto.UserResponse;
import com.buddies.giftbox.oms.api.security.AuthPrincipal;
import com.buddies.giftbox.oms.api.security.JwtTokenService;
import com.buddies.giftbox.oms.application.auth.AuthException;
import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtTokenService jwt;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository, JwtTokenService jwt) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwt = jwt;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
            );
        } catch (AuthenticationException ex) {
            throw new AuthException("Invalid credentials");
        }

        String email = (req.getEmail() == null) ? "" : req.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("Invalid credentials"));

        if (!user.active()) {
            throw new AuthException("User is disabled");
        }

        Long userId = user.id() == null ? null : user.id().value();
        String token = jwt.generateToken(userId, user.email());

        UserResponse userResponse = new UserResponse(userId, user.email(), user.roles());
        return ResponseEntity.ok(new LoginResponse(token, userResponse));
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
