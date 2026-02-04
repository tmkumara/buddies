package com.buddies.giftbox.oms.application.admin;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PermissionSummary {
    Long id;
    String code;
    String description;
}
