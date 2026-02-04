package com.buddies.giftbox.oms.application.admin;

import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.domain.auth.PermissionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PermissionAdminService {
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<PermissionSummary> listPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public PermissionSummary createPermission(PermissionCommand command) {
        if (permissionRepository.existsByCode(command.getCode())) {
            throw new IllegalArgumentException("Permission already exists");
        }
        Permission permission = Permission.builder()
                .code(command.getCode())
                .description(command.getDescription())
                .build();
        return toSummary(permissionRepository.save(permission));
    }

    @Transactional
    public PermissionSummary updatePermission(Long id, PermissionCommand command) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Permission not found"));

        Permission updated = Permission.builder()
                .id(permission.getId())
                .code(command.getCode() != null ? command.getCode() : permission.getCode())
                .description(command.getDescription() != null ? command.getDescription() : permission.getDescription())
                .build();
        return toSummary(permissionRepository.save(updated));
    }

    private PermissionSummary toSummary(Permission permission) {
        return PermissionSummary.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .description(permission.getDescription())
                .build();
    }
}
