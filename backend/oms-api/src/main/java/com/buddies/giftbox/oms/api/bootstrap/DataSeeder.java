package com.buddies.giftbox.oms.api.bootstrap;

import com.buddies.giftbox.oms.application.security.PasswordHasher;
import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.domain.auth.PermissionRepository;
import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.RoleRepository;
import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AdminBootstrapProperties properties;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            log.info("[BOOTSTRAP] disabled");
            return;
        }

        seedPermissions();
        seedRoles();
        seedUsers();
    }

    private void seedPermissions() {
        List<Permission> permissions = List.of(
                Permission.builder().code("USER_READ").description("Read users").build(),
                Permission.builder().code("USER_WRITE").description("Manage users").build(),
                Permission.builder().code("ROLE_READ").description("Read roles").build(),
                Permission.builder().code("ROLE_WRITE").description("Manage roles").build(),
                Permission.builder().code("PERMISSION_READ").description("Read permissions").build(),
                Permission.builder().code("PERMISSION_WRITE").description("Manage permissions").build()
        );

        for (Permission permission : permissions) {
            if (!permissionRepository.existsByCode(permission.getCode())) {
                permissionRepository.save(permission);
            }
        }
    }

    private void seedRoles() {
        Permission userRead = permissionRepository.findByCode("USER_READ").orElseThrow();
        Permission userWrite = permissionRepository.findByCode("USER_WRITE").orElseThrow();
        Permission roleRead = permissionRepository.findByCode("ROLE_READ").orElseThrow();
        Permission roleWrite = permissionRepository.findByCode("ROLE_WRITE").orElseThrow();
        Permission permRead = permissionRepository.findByCode("PERMISSION_READ").orElseThrow();
        Permission permWrite = permissionRepository.findByCode("PERMISSION_WRITE").orElseThrow();

        if (!roleRepository.existsByName("ADMIN")) {
            roleRepository.save(Role.builder()
                    .name("ADMIN")
                    .description("System administrator")
                    .permissions(Set.of(userRead, userWrite, roleRead, roleWrite, permRead, permWrite))
                    .build());
        }

        if (!roleRepository.existsByName("MANAGER")) {
            roleRepository.save(Role.builder()
                    .name("MANAGER")
                    .description("Operations manager")
                    .permissions(Set.of(userRead, roleRead, permRead))
                    .build());
        }

        if (!roleRepository.existsByName("USER")) {
            roleRepository.save(Role.builder()
                    .name("USER")
                    .description("Standard user")
                    .permissions(Set.of())
                    .build());
        }
    }

    private void seedUsers() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseThrow();
        Role userRole = roleRepository.findByName("USER").orElseThrow();

        String adminEmail = properties.getEmail();
        if (adminEmail != null && !userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordHasher.hash(properties.getPassword()))
                    .fullName("Admin")
                    .enabled(true)
                    .roles(new LinkedHashSet<>(Set.of(adminRole)))
                    .build();
            userRepository.save(admin);
        }

        String sampleEmail = properties.getSampleEmail();
        if (sampleEmail != null && !userRepository.existsByEmail(sampleEmail)) {
            User sample = User.builder()
                    .email(sampleEmail)
                    .passwordHash(passwordHasher.hash(properties.getSamplePassword()))
                    .fullName("Sample User")
                    .enabled(true)
                    .roles(new LinkedHashSet<>(Set.of(userRole)))
                    .build();
            userRepository.save(sample);
        }
    }
}
