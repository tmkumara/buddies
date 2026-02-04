package com.buddies.giftbox.oms.infrastructure.persistence.mapper;

import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.PermissionEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toDomain(PermissionEntity entity);
    PermissionEntity toEntity(Permission permission);
}
