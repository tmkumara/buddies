package com.buddies.giftbox.oms.infrastructure.persistence.adapter;

import com.buddies.giftbox.oms.domain.auth.Permission;
import com.buddies.giftbox.oms.domain.auth.PermissionRepository;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.PermissionEntity;
import com.buddies.giftbox.oms.infrastructure.persistence.mapper.PermissionMapper;
import com.buddies.giftbox.oms.infrastructure.persistence.repository.PermissionJpaRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class PermissionRepositoryAdapter implements PermissionRepository {
    private final PermissionJpaRepository permissionJpaRepository;
    private final PermissionMapper permissionMapper;

    @Override
    public Optional<Permission> findById(Long id) {
        return permissionJpaRepository.findById(id).map(permissionMapper::toDomain);
    }

    @Override
    public Optional<Permission> findByCode(String code) {
        return permissionJpaRepository.findByCode(code).map(permissionMapper::toDomain);
    }

    @Override
    public List<Permission> findAll() {
        return permissionJpaRepository.findAll().stream().map(permissionMapper::toDomain).toList();
    }

    @Override
    public Permission save(Permission permission) {
        PermissionEntity entity = permission.getId() == null
                ? new PermissionEntity()
                : permissionJpaRepository.findById(permission.getId()).orElseGet(PermissionEntity::new);

        PermissionEntity mapped = permissionMapper.toEntity(permission);
        entity.setCode(mapped.getCode());
        entity.setDescription(mapped.getDescription());

        PermissionEntity saved = permissionJpaRepository.save(entity);
        return permissionMapper.toDomain(saved);
    }

    @Override
    public void deleteById(Long id) {
        permissionJpaRepository.deleteById(id);
    }

    @Override
    public boolean existsByCode(String code) {
        return permissionJpaRepository.existsByCode(code);
    }
}
