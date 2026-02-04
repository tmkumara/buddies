package com.buddies.giftbox.oms.application.auth;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RegisterRequest {
    String email;
    String password;
    String fullName;
}
