package com.buddies.giftbox.oms.api.auth.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class MeResponse {
    UserResponse user;
}
