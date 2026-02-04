package com.buddies.giftbox.oms.api.security;

import java.util.Set;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthPrincipal {
    Long userId;
    String email;
    String fullName;
    Set<String> roles;
    Set<String> permissions;
}
