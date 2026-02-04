package com.buddies.giftbox.oms.application.auth;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthResponse {
    AuthUserView user;
    AuthTokens tokens;
}
