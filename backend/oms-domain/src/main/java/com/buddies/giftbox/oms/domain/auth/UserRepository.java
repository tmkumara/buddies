package com.buddies.giftbox.oms.domain.auth;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepository {
    Optional<User> findByEmail(String email);
    Optional<User> findById(Long id);
    User save(User user);
    Page<User> findAll(Pageable pageable);
    boolean existsByEmail(String email);
}
