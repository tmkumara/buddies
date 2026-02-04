package com.buddies.giftbox.oms.domain.auth;

import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RefreshToken {
    Long id;
    Long userId;
    String tokenHash;
    Instant expiresAt;
    Instant revokedAt;
}
