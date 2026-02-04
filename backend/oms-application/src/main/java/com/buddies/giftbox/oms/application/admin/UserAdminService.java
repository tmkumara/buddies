package com.buddies.giftbox.oms.application.admin;

import com.buddies.giftbox.oms.application.security.PasswordHasher;
import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.RoleRepository;
import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAdminService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordHasher passwordHasher;

    @Transactional(readOnly = true)
    public Page<UserSummary> listUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public UserSummary getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return toSummary(user);
    }

    @Transactional
    public UserSummary createUser(CreateUserCommand command) {
        String email = normalizeEmail(command.getEmail());
        if (email == null || command.getPassword() == null) {
            throw new IllegalArgumentException("Email and password are required");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }

        Set<Role> roles = resolveRoles(command.getRoleNames());

        User user = User.builder()
                .email(email)
                .passwordHash(passwordHasher.hash(command.getPassword()))
                .fullName(command.getFullName())
                .enabled(command.isEnabled())
                .roles(roles)
                .build();

        return toSummary(userRepository.save(user));
    }

    @Transactional
    public UserSummary updateUser(Long id, UpdateUserCommand command) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        User updated = user.toBuilder()
                .fullName(command.getFullName() != null ? command.getFullName() : user.getFullName())
                .enabled(command.getEnabled() != null ? command.getEnabled() : user.isEnabled())
                .build();

        return toSummary(userRepository.save(updated));
    }

    @Transactional
    public UserSummary assignRoles(Long id, AssignRolesCommand command) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Set<Role> roles = resolveRoles(command.getRoleNames());
        User updated = user.toBuilder().roles(roles).build();
        return toSummary(userRepository.save(updated));
    }

    @Transactional
    public void resetPassword(Long id, ResetPasswordCommand command) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User updated = user.toBuilder()
                .passwordHash(passwordHasher.hash(command.getNewPassword()))
                .build();
        userRepository.save(updated);
    }

    @Transactional
    public UserSummary disableUser(Long id, boolean enabled) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User updated = user.toBuilder().enabled(enabled).build();
        return toSummary(userRepository.save(updated));
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        if (roleNames == null || roleNames.isEmpty()) {
            return new HashSet<>();
        }
        return roleNames.stream()
                .map(name -> roleRepository.findByName(name)
                        .orElseThrow(() -> new IllegalArgumentException("Role not found: " + name)))
                .collect(Collectors.toSet());
    }

    private UserSummary toSummary(User user) {
        Set<Role> rolesValue = user.getRoles() == null ? Set.of() : user.getRoles();
        Set<String> roleNames = rolesValue.stream().map(Role::getName).collect(Collectors.toSet());
        Set<String> permissions = rolesValue.stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(Permission::getCode)
                .collect(Collectors.toSet());
        Set<com.buddies.giftbox.oms.domain.auth.Permission> directPermissions = user.getPermissions() == null
                ? Set.of()
                : user.getPermissions();
        permissions.addAll(directPermissions.stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet()));
        return UserSummary.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .enabled(user.isEnabled())
                .roles(roleNames)
                .permissions(permissions)
                .build();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
