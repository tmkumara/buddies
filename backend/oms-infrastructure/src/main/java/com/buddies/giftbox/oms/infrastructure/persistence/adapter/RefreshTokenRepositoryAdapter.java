package com.buddies.giftbox.oms.infrastructure.persistence.adapter;

import com.buddies.giftbox.oms.domain.auth.RefreshToken;
import com.buddies.giftbox.oms.domain.auth.RefreshTokenRepository;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.RefreshTokenEntity;
import com.buddies.giftbox.oms.infrastructure.persistence.mapper.RefreshTokenMapper;
import com.buddies.giftbox.oms.infrastructure.persistence.repository.RefreshTokenJpaRepository;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepositoryAdapter implements RefreshTokenRepository {
    private final RefreshTokenJpaRepository refreshTokenJpaRepository;
    private final RefreshTokenMapper refreshTokenMapper;

    @Override
    public RefreshToken save(RefreshToken token) {
        RefreshTokenEntity entity = refreshTokenMapper.toEntity(token);
        RefreshTokenEntity saved = refreshTokenJpaRepository.save(entity);
        return refreshTokenMapper.toDomain(saved);
    }

    @Override
    public Optional<RefreshToken> findByTokenHash(String tokenHash) {
        return refreshTokenJpaRepository.findByTokenHash(tokenHash)
                .map(refreshTokenMapper::toDomain);
    }

    @Override
    public void revokeToken(Long id, Instant revokedAt) {
        refreshTokenJpaRepository.findById(id).ifPresent(entity -> {
            entity.setRevokedAt(revokedAt);
            refreshTokenJpaRepository.save(entity);
        });
    }

    @Override
    public void revokeAllForUser(Long userId, Instant revokedAt) {
        refreshTokenJpaRepository.findAll().stream()
                .filter(token -> token.getUserId().equals(userId) && token.getRevokedAt() == null)
                .forEach(token -> {
                    token.setRevokedAt(revokedAt);
                    refreshTokenJpaRepository.save(token);
                });
    }
}
