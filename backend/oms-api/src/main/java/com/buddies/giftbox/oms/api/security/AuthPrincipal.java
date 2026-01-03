package com.buddies.giftbox.oms.api.security;

import com.buddies.giftbox.oms.domain.auth.Role;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class AuthPrincipal {

    private final Long userId;
    private final String email;
    private final Set<Role> roles;

    public AuthPrincipal(Long userId, String email, Set<Role> roles) {
        this.userId = userId;
        this.email = email;
        this.roles = Collections.unmodifiableSet(new HashSet<Role>(roles == null ? Collections.<Role>emptySet() : roles));
    }

    public Long userId() {
        return userId;
    }

    public String email() {
        return email;
    }

    public Set<Role> roles() {
        return roles;
    }
}
