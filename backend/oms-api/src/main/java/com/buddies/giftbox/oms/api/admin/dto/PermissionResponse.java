package com.buddies.giftbox.oms.api.admin.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PermissionResponse {
    Long id;
    String code;
    String description;
}
