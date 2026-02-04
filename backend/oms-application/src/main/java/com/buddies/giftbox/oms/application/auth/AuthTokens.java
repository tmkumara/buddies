package com.buddies.giftbox.oms.application.auth;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthTokens {
    String accessToken;
    String refreshToken;
    long expiresInSeconds;
    long refreshTokenExpiresInSeconds;
}
