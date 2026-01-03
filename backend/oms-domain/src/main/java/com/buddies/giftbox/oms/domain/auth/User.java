package com.buddies.giftbox.oms.domain.auth;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public final class User {

    private final UserId id;
    private final String email;
    private final String passwordHash;
    private final Set<Role> roles;
    private final boolean active;

    public User(UserId id,
                String email,
                String passwordHash,
                Set<Role> roles,
                boolean active) {

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("email cannot be blank");
        }
        if (passwordHash == null || passwordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("passwordHash cannot be blank");
        }

        this.id = id; // can be null before persistence (optional)
        this.email = email.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.roles = Collections.unmodifiableSet(new HashSet<Role>(roles == null ? Collections.<Role>emptySet() : roles));
        this.active = active;
    }

    public UserId id() {
        return id;
    }

    public String email() {
        return email;
    }

    public String passwordHash() {
        return passwordHash;
    }

    public Set<Role> roles() {
        return roles;
    }

    public boolean active() {
        return active;
    }

    public boolean hasRole(Role role) {
        return roles.contains(role);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User user = (User) o;

        // If IDs exist, compare by ID; otherwise compare by email
        if (id != null && user.id != null) {
            return Objects.equals(id, user.id);
        }
        return Objects.equals(email, user.email);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : Objects.hash(email);
    }
}
