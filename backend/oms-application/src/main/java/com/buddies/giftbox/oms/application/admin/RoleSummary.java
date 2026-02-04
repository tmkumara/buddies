package com.buddies.giftbox.oms.application.admin;

import java.util.Set;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RoleSummary {
    Long id;
    String name;
    String description;
    Set<String> permissions;
}
