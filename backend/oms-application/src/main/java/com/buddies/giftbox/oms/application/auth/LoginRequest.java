package com.buddies.giftbox.oms.application.auth;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LoginRequest {
    String email;
    String password;
}
