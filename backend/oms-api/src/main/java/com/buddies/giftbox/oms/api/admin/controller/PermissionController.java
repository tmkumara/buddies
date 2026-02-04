package com.buddies.giftbox.oms.api.admin.controller;

import com.buddies.giftbox.oms.api.admin.dto.PermissionRequest;
import com.buddies.giftbox.oms.api.admin.dto.PermissionResponse;
import com.buddies.giftbox.oms.application.admin.PermissionAdminService;
import com.buddies.giftbox.oms.application.admin.PermissionCommand;
import com.buddies.giftbox.oms.application.admin.PermissionSummary;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/permissions")
public class PermissionController {
    private final PermissionAdminService permissionAdminService;

    public PermissionController(PermissionAdminService permissionAdminService) {
        this.permissionAdminService = permissionAdminService;
    }

    @GetMapping
    @PreAuthorize("hasPermission(null, 'PERMISSION_READ')")
    public List<PermissionResponse> listPermissions() {
        return permissionAdminService.listPermissions().stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasPermission(null, 'PERMISSION_WRITE')")
    public PermissionResponse createPermission(@RequestBody PermissionRequest request) {
        PermissionSummary summary = permissionAdminService.createPermission(PermissionCommand.builder()
                .code(request.getCode())
                .description(request.getDescription())
                .build());
        return toResponse(summary);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasPermission(null, 'PERMISSION_WRITE')")
    public PermissionResponse updatePermission(@PathVariable Long id, @RequestBody PermissionRequest request) {
        PermissionSummary summary = permissionAdminService.updatePermission(id, PermissionCommand.builder()
                .code(request.getCode())
                .description(request.getDescription())
                .build());
        return toResponse(summary);
    }

    private PermissionResponse toResponse(PermissionSummary summary) {
        return PermissionResponse.builder()
                .id(summary.getId())
                .code(summary.getCode())
                .description(summary.getDescription())
                .build();
    }
}
