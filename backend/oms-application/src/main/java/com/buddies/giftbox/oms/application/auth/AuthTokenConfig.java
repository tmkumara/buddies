package com.buddies.giftbox.oms.application.auth;

import java.time.Duration;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthTokenConfig {
    Duration accessTokenTtl;
    Duration refreshTokenTtl;
}
