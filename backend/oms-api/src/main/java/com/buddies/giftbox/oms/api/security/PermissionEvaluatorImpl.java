package com.buddies.giftbox.oms.api.security;

import java.io.Serializable;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;

public class PermissionEvaluatorImpl implements PermissionEvaluator {
    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (authentication == null || permission == null) {
            return false;
        }
        String permissionValue = String.valueOf(permission);
        return authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("PERMISSION_" + permissionValue));
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType, Object permission) {
        return hasPermission(authentication, null, permission);
    }
}
