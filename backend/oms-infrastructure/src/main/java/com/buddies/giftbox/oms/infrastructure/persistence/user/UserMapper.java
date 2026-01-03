package com.buddies.giftbox.oms.infrastructure.persistence.user;

import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserId;

final class UserMapper {

    private UserMapper() {}

    static User toDomain(UserEntity e) {
        return new User(
                e.getId() == null ? null : new UserId(e.getId()),
                e.getEmail(),
                e.getPasswordHash(),
                e.getRoles(),
                e.isActive()
        );
    }
}
