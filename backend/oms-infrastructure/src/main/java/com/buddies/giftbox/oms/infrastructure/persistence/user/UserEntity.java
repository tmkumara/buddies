package com.buddies.giftbox.oms.infrastructure.persistence.user;

import com.buddies.giftbox.oms.domain.auth.Role;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email", unique = true)
        }
)
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 190, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 120)
    private String passwordHash;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id", nullable = false)
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Set<Role> roles = new HashSet<Role>();

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected UserEntity() {
        // JPA
    }

    public UserEntity(String email, String passwordHash, Set<Role> roles, boolean active) {
        this.email = email;
        this.passwordHash = passwordHash;
        if (roles != null) {
            this.roles = roles;
        }
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public boolean isActive() {
        return active;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = (roles == null) ? new HashSet<Role>() : roles;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
