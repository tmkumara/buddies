package com.buddies.giftbox.oms.infrastructure.persistence.repository;

import com.buddies.giftbox.oms.infrastructure.persistence.entity.RoleEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleJpaRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByName(String name);
    boolean existsByName(String name);
}
