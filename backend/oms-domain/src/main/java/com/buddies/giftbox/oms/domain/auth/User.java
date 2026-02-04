package com.buddies.giftbox.oms.domain.auth;

import java.time.Instant;
import java.util.Set;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Value
@Builder(toBuilder = true)
public class User {
    Long id;
    String email;
    String passwordHash;
    boolean enabled;
    String fullName;
    @Singular
    Set<Role> roles;
    @Singular
    Set<Permission> permissions;
    Instant createdAt;
    Instant updatedAt;
}
