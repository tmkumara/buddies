package com.buddies.giftbox.oms.application.auth;

import java.util.Set;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthUserView {
    Long id;
    String email;
    String fullName;
    boolean enabled;
    Set<String> roles;
    Set<String> permissions;
}
