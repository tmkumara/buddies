package com.buddies.giftbox.oms.api.admin.controller;

import com.buddies.giftbox.oms.api.admin.dto.AdminUserResponse;
import com.buddies.giftbox.oms.api.admin.dto.AssignRolesRequest;
import com.buddies.giftbox.oms.api.admin.dto.CreateUserRequest;
import com.buddies.giftbox.oms.api.admin.dto.ResetPasswordRequest;
import com.buddies.giftbox.oms.api.admin.dto.UpdateUserRequest;
import com.buddies.giftbox.oms.application.admin.AssignRolesCommand;
import com.buddies.giftbox.oms.application.admin.CreateUserCommand;
import com.buddies.giftbox.oms.application.admin.ResetPasswordCommand;
import com.buddies.giftbox.oms.application.admin.UpdateUserCommand;
import com.buddies.giftbox.oms.application.admin.UserAdminService;
import com.buddies.giftbox.oms.application.admin.UserSummary;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final UserAdminService userAdminService;

    public AdminUserController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    @PreAuthorize("hasPermission(null, 'USER_READ')")
    public Page<AdminUserResponse> listUsers(Pageable pageable) {
        return userAdminService.listUsers(pageable)
                .map(this::toResponse);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasPermission(null, 'USER_READ')")
    public AdminUserResponse getUser(@PathVariable Long id) {
        return toResponse(userAdminService.getUser(id));
    }

    @PostMapping
    @PreAuthorize("hasPermission(null, 'USER_WRITE')")
    public AdminUserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        UserSummary summary = userAdminService.createUser(CreateUserCommand.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .fullName(request.getFullName())
                .enabled(request.isEnabled())
                .roleNames(request.getRoleNames())
                .build());
        return toResponse(summary);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasPermission(null, 'USER_WRITE')")
    public AdminUserResponse updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        UserSummary summary = userAdminService.updateUser(id, UpdateUserCommand.builder()
                .fullName(request.getFullName())
                .enabled(request.getEnabled())
                .build());
        return toResponse(summary);
    }

    @PatchMapping("/{id}/disable")
    @PreAuthorize("hasPermission(null, 'USER_WRITE')")
    public AdminUserResponse disableUser(@PathVariable Long id) {
        return toResponse(userAdminService.disableUser(id, false));
    }

    @PatchMapping("/{id}/enable")
    @PreAuthorize("hasPermission(null, 'USER_WRITE')")
    public AdminUserResponse enableUser(@PathVariable Long id) {
        return toResponse(userAdminService.disableUser(id, true));
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasPermission(null, 'USER_WRITE')")
    public AdminUserResponse assignRoles(@PathVariable Long id, @RequestBody AssignRolesRequest request) {
        UserSummary summary = userAdminService.assignRoles(id, AssignRolesCommand.builder()
                .roleNames(request.getRoleNames())
                .build());
        return toResponse(summary);
    }

    @PutMapping("/{id}/reset-password")
    @PreAuthorize("hasPermission(null, 'USER_WRITE')")
    public void resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest request) {
        userAdminService.resetPassword(id, ResetPasswordCommand.builder()
                .newPassword(request.getNewPassword())
                .build());
    }

    private AdminUserResponse toResponse(UserSummary summary) {
        return AdminUserResponse.builder()
                .id(summary.getId())
                .email(summary.getEmail())
                .fullName(summary.getFullName())
                .enabled(summary.isEnabled())
                .roles(summary.getRoles())
                .permissions(summary.getPermissions())
                .build();
    }
}
