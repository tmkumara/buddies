package com.buddies.giftbox.oms.infrastructure.persistence.user;

import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserId;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class UserRepositoryAdapter implements UserRepository {

    private final UserJpaRepository jpa;

    public UserRepositoryAdapter(UserJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Optional<User> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return jpa.findByEmailIgnoreCase(email.trim())
                .map(UserMapper::toDomain);
    }

    @Override
    public Optional<User> findById(UserId id) {
        if (id == null) return Optional.empty();
        return jpa.findById(id.value())
                .map(UserMapper::toDomain);
    }
}
