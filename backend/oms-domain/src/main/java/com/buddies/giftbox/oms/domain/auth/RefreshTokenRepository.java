package com.buddies.giftbox.oms.domain.auth;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository {
    RefreshToken save(RefreshToken token);
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    void revokeToken(Long id, Instant revokedAt);
    void revokeAllForUser(Long userId, Instant revokedAt);
}
