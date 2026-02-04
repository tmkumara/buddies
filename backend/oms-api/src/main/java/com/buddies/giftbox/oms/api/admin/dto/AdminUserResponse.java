package com.buddies.giftbox.oms.api.admin.dto;

import java.util.Set;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminUserResponse {
    Long id;
    String email;
    String fullName;
    boolean enabled;
    Set<String> roles;
    Set<String> permissions;
}
