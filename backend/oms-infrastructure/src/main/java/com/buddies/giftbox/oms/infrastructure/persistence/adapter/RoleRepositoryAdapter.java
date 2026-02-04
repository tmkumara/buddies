package com.buddies.giftbox.oms.infrastructure.persistence.adapter;

import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.RoleRepository;
import com.buddies.giftbox.oms.infrastructure.persistence.entity.RoleEntity;
import com.buddies.giftbox.oms.infrastructure.persistence.mapper.RoleMapper;
import com.buddies.giftbox.oms.infrastructure.persistence.repository.RoleJpaRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RoleRepositoryAdapter implements RoleRepository {
    private final RoleJpaRepository roleJpaRepository;
    private final RoleMapper roleMapper;

    @Override
    public Optional<Role> findById(Long id) {
        return roleJpaRepository.findById(id).map(roleMapper::toDomain);
    }

    @Override
    public Optional<Role> findByName(String name) {
        return roleJpaRepository.findByName(name).map(roleMapper::toDomain);
    }

    @Override
    public List<Role> findAll() {
        return roleJpaRepository.findAll().stream().map(roleMapper::toDomain).toList();
    }

    @Override
    public Role save(Role role) {
        RoleEntity entity = role.getId() == null
                ? new RoleEntity()
                : roleJpaRepository.findById(role.getId()).orElseGet(RoleEntity::new);

        RoleEntity mapped = roleMapper.toEntity(role);
        entity.setName(mapped.getName());
        entity.setDescription(mapped.getDescription());
        entity.setPermissions(mapped.getPermissions());

        RoleEntity saved = roleJpaRepository.save(entity);
        return roleMapper.toDomain(saved);
    }

    @Override
    public void deleteById(Long id) {
        roleJpaRepository.deleteById(id);
    }

    @Override
    public boolean existsByName(String name) {
        return roleJpaRepository.existsByName(name);
    }
}
