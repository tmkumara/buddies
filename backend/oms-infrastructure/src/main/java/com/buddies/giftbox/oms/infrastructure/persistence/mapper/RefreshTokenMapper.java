package com.buddies.giftbox.oms.infrastructure.persistence.mapper;

import com.buddies.giftbox.oms.domain.auth.RefreshToken;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.RefreshTokenEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RefreshTokenMapper {
    RefreshToken toDomain(RefreshTokenEntity entity);
    RefreshTokenEntity toEntity(RefreshToken token);
}
