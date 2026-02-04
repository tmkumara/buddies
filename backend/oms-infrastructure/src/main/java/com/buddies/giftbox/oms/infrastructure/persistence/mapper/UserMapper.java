package com.buddies.giftbox.oms.infrastructure.persistence.mapper;

import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {RoleMapper.class, PermissionMapper.class})
public interface UserMapper {
    @Mapping(target = "roles", source = "roles")
    @Mapping(target = "permissions", source = "permissions")
    User toDomain(UserEntity entity);

    @Mapping(target = "roles", source = "roles")
    @Mapping(target = "permissions", source = "permissions")
    UserEntity toEntity(User user);
}
