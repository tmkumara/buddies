package com.buddies.giftbox.oms.domain.auth;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository {
    Optional<Permission> findById(Long id);
    Optional<Permission> findByCode(String code);
    List<Permission> findAll();
    Permission save(Permission permission);
    void deleteById(Long id);
    boolean existsByCode(String code);
}
