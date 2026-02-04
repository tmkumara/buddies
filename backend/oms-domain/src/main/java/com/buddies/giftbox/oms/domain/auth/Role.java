package com.buddies.giftbox.oms.domain.auth;

import java.util.Set;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Value
@Builder
public class Role {
    Long id;
    String name;
    String description;
    @Singular
    Set<Permission> permissions;
}
