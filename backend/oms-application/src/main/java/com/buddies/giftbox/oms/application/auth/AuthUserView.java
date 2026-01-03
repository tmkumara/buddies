package com.buddies.giftbox.oms.application.auth;

import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.UserId;

import java.util.Set;

public final class AuthUserView {
    private final UserId id;
    private final String email;
    private final Set<Role> roles;

    public AuthUserView(UserId id, String email, Set<Role> roles) {
        this.id = id;
        this.email = email;
        this.roles = roles;
    }

    public UserId id() {
        return id;
    }

    public String email() {
        return email;
    }

    public Set<Role> roles() {
        return roles;
    }
}
