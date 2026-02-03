package com.buddies.giftbox.oms.api.security;

import com.buddies.giftbox.oms.domain.auth.Role;
import com.buddies.giftbox.oms.domain.auth.User;
import com.buddies.giftbox.oms.domain.auth.UserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

public class RepositoryUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public RepositoryUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String email = (username == null) ? null : username.trim().toLowerCase();
        if (email == null || email.isEmpty()) {
            throw new UsernameNotFoundException("User not found");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (!user.active()) {
            throw new UsernameNotFoundException("User disabled");
        }

        return new org.springframework.security.core.userdetails.User(
                user.email(),
                user.passwordHash(),
                buildAuthorities(user.roles())
        );
    }

    private static Collection<? extends GrantedAuthority> buildAuthorities(java.util.Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                .collect(Collectors.toUnmodifiableList());
    }
}
