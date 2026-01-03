package com.buddies.giftbox.oms.domain.auth;

import java.util.Optional;

public interface UserRepository {
    Optional<User> findByEmail(String email);
    Optional<User> findById(UserId id);
}
