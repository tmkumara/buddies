package com.buddies.giftbox.oms.api.auth.dto;

import com.buddies.giftbox.oms.domain.auth.Role;

import java.util.Set;

public class UserResponse {
    private final Long id;
    private final String email;
    private final Set<Role> roles;

    public UserResponse(Long id, String email, Set<Role> roles) {
        this.id = id;
        this.email = email;
        this.roles = roles;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public Set<Role> getRoles() {
        return roles;
    }
}
