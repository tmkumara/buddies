package com.buddies.giftbox.oms.api.bootstrap;

import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.infrastructure.persistence.user.UserEntity;
import com.buddies.giftbox.oms.infrastructure.persistence.user.UserJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Component
@Profile("dev") // ✅ only runs in dev. Remove this if you want flag-only control.
public class AdminUserBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserBootstrapRunner.class);

    private final AdminBootstrapProperties props;
    private final UserJpaRepository userJpaRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserBootstrapRunner(AdminBootstrapProperties props,
                                    UserJpaRepository userJpaRepository,
                                    PasswordEncoder passwordEncoder) {
        this.props = props;
        this.userJpaRepository = userJpaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.isEnabled()) {
            log.info("[BOOTSTRAP][ADMIN] disabled (app.bootstrap.admin.enabled=false)");
            return;
        }

        String email = (props.getEmail() == null) ? null : props.getEmail().trim().toLowerCase();
        String password = props.getPassword();

        if (email == null || email.isEmpty() || password == null || password.trim().isEmpty()) {
            log.warn("[BOOTSTRAP][ADMIN] missing email/password. Set app.bootstrap.admin.email and app.bootstrap.admin.password.");
            return;
        }

        boolean exists = userJpaRepository.findByEmailIgnoreCase(email).isPresent();
        if (exists) {
            log.info("[BOOTSTRAP][ADMIN] admin already exists: {}", email);
            return;
        }

        String hash = passwordEncoder.encode(password);

        Set<Role> roles = new HashSet<Role>();
        roles.add(Role.ADMIN);

        UserEntity admin = new UserEntity(email, hash, roles, true);
        userJpaRepository.save(admin);

        log.info("[BOOTSTRAP][ADMIN] created admin user: {}", email);
    }
}
