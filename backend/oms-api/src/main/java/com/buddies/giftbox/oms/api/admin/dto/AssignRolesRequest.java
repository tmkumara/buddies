package com.buddies.giftbox.oms.api.admin.dto;

import java.util.Set;
import lombok.Data;

@Data
public class AssignRolesRequest {
    private Set<String> roleNames;
}
