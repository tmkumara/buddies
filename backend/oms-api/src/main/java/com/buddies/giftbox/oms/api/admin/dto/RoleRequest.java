package com.buddies.giftbox.oms.api.admin.dto;

import java.util.Set;
import lombok.Data;

@Data
public class RoleRequest {
    private String name;
    private String description;
    private Set<String> permissionCodes;
}
