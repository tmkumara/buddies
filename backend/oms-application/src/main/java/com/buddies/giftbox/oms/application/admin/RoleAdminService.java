package com.buddies.giftbox.oms.application.admin;

import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.domain.auth.PermissionRepository;
import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.RoleRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RoleAdminService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<RoleSummary> listRoles() {
        return roleRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public RoleSummary createRole(RoleCommand command) {
        if (roleRepository.existsByName(command.getName())) {
            throw new IllegalArgumentException("Role already exists");
        }
        Role role = Role.builder()
                .name(command.getName())
                .description(command.getDescription())
                .permissions(resolvePermissions(command.getPermissionCodes()))
                .build();
        return toSummary(roleRepository.save(role));
    }

    @Transactional
    public RoleSummary updateRole(Long id, RoleCommand command) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        Role updated = Role.builder()
                .id(role.getId())
                .name(command.getName() != null ? command.getName() : role.getName())
                .description(command.getDescription() != null ? command.getDescription() : role.getDescription())
                .permissions(command.getPermissionCodes() != null ? resolvePermissions(command.getPermissionCodes()) : role.getPermissions())
                .build();
        return toSummary(roleRepository.save(updated));
    }

    @Transactional
    public RoleSummary assignPermissions(Long id, Set<String> permissionCodes) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        Role updated = Role.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(resolvePermissions(permissionCodes))
                .build();
        return toSummary(roleRepository.save(updated));
    }

    private Set<Permission> resolvePermissions(Set<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return Set.of();
        }
        return codes.stream()
                .map(code -> permissionRepository.findByCode(code)
                        .orElseThrow(() -> new IllegalArgumentException("Permission not found: " + code)))
                .collect(Collectors.toSet());
    }

    private RoleSummary toSummary(Role role) {
        Set<String> permissions = role.getPermissions().stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());
        return RoleSummary.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(permissions)
                .build();
    }
}
