package com.buddies.giftbox.oms.domain.auth;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class Permission {
    Long id;
    String code;
    String description;
}
