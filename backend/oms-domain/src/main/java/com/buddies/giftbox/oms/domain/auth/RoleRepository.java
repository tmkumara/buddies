package com.buddies.giftbox.oms.domain.auth;

import java.util.List;
import java.util.Optional;

public interface RoleRepository {
    Optional<Role> findById(Long id);
    Optional<Role> findByName(String name);
    List<Role> findAll();
    Role save(Role role);
    void deleteById(Long id);
    boolean existsByName(String name);
}
