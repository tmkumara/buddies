package com.buddies.giftbox.oms.api.admin.controller;

import com.buddies.giftbox.oms.api.admin.dto.RoleRequest;
import com.buddies.giftbox.oms.api.admin.dto.RoleResponse;
import com.buddies.giftbox.oms.application.admin.RoleAdminService;
import com.buddies.giftbox.oms.application.admin.RoleCommand;
import com.buddies.giftbox.oms.application.admin.RoleSummary;
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
@RequestMapping("/api/admin/roles")
public class RoleController {
    private final RoleAdminService roleAdminService;

    public RoleController(RoleAdminService roleAdminService) {
        this.roleAdminService = roleAdminService;
    }

    @GetMapping
    @PreAuthorize("hasPermission(null, 'ROLE_READ')")
    public List<RoleResponse> listRoles() {
        return roleAdminService.listRoles().stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasPermission(null, 'ROLE_WRITE')")
    public RoleResponse createRole(@RequestBody RoleRequest request) {
        RoleSummary summary = roleAdminService.createRole(RoleCommand.builder()
                .name(request.getName())
                .description(request.getDescription())
                .permissionCodes(request.getPermissionCodes())
                .build());
        return toResponse(summary);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasPermission(null, 'ROLE_WRITE')")
    public RoleResponse updateRole(@PathVariable Long id, @RequestBody RoleRequest request) {
        RoleSummary summary = roleAdminService.updateRole(id, RoleCommand.builder()
                .name(request.getName())
                .description(request.getDescription())
                .permissionCodes(request.getPermissionCodes())
                .build());
        return toResponse(summary);
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasPermission(null, 'ROLE_WRITE')")
    public RoleResponse assignPermissions(@PathVariable Long id, @RequestBody RoleRequest request) {
        RoleSummary summary = roleAdminService.assignPermissions(id, request.getPermissionCodes());
        return toResponse(summary);
    }

    private RoleResponse toResponse(RoleSummary summary) {
        return RoleResponse.builder()
                .id(summary.getId())
                .name(summary.getName())
                .description(summary.getDescription())
                .permissions(summary.getPermissions())
                .build();
    }
}
