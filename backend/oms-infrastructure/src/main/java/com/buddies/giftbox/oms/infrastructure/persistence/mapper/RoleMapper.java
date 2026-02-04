package com.buddies.giftbox.oms.infrastructure.persistence.mapper;

import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.RoleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = PermissionMapper.class)
public interface RoleMapper {
    @Mapping(target = "permissions", source = "permissions")
    Role toDomain(RoleEntity entity);

    @Mapping(target = "permissions", source = "permissions")
    RoleEntity toEntity(Role role);
}
