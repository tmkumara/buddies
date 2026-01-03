package com.buddies.giftbox.oms.application.auth;

import com.buddies.giftbox.oms.application.security.PasswordHasher;
import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;

    public AuthService(UserRepository userRepository, PasswordHasher passwordHasher) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }

    public LoginResult login(LoginCommand cmd) {
        if (cmd == null) {
            throw new AuthException("Invalid credentials");
        }

        String email = (cmd.email() == null) ? null : cmd.email().trim().toLowerCase();
        String password = cmd.password();

        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            throw new AuthException("Invalid credentials");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("Invalid credentials"));

        if (!user.active()) {
            throw new AuthException("User is disabled");
        }

        boolean ok = passwordHasher.matches(password, user.passwordHash());
        if (!ok) {
            throw new AuthException("Invalid credentials");
        }

        AuthUserView view = new AuthUserView(user.id(), user.email(), user.roles());
        return new LoginResult(view);
    }
}
