package com.buddies.giftbox.oms.api.admin.dto;

import java.util.Set;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RoleResponse {
    Long id;
    String name;
    String description;
    Set<String> permissions;
}
