package com.buddies.giftbox.oms.infrastructure.persistence.adapter;

import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.UserEntity;
import com.buddies.giftbox.oms.infrastructure.persistence.mapper.UserMapper;
import com.buddies.giftbox.oms.infrastructure.persistence.repository.UserJpaRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepository {
    private final UserJpaRepository userJpaRepository;
    private final UserMapper userMapper;

    @Override
    public Optional<User> findByEmail(String email) {
        return userJpaRepository.findByEmail(email)
                .map(userMapper::toDomain);
    }

    @Override
    public Optional<User> findById(Long id) {
        return userJpaRepository.findById(id)
                .map(userMapper::toDomain);
    }

    @Override
    public User save(User user) {
        UserEntity entity = user.getId() == null
                ? new UserEntity()
                : userJpaRepository.findById(user.getId()).orElseGet(UserEntity::new);

        UserEntity mapped = userMapper.toEntity(user);
        entity.setEmail(mapped.getEmail());
        entity.setPasswordHash(mapped.getPasswordHash());
        entity.setFullName(mapped.getFullName());
        entity.setEnabled(mapped.isEnabled());
        entity.setRoles(mapped.getRoles());
        entity.setPermissions(mapped.getPermissions());

        UserEntity saved = userJpaRepository.save(entity);
        return userMapper.toDomain(saved);
    }

    @Override
    public Page<User> findAll(Pageable pageable) {
        return userJpaRepository.findAll(pageable)
                .map(userMapper::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userJpaRepository.existsByEmail(email);
    }
}
