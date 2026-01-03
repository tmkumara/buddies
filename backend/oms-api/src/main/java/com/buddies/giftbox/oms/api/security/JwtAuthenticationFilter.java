package com.buddies.giftbox.oms.api.security;

import com.buddies.giftbox.oms.domain.auth.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwt;

    public JwtAuthenticationFilter(JwtTokenService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();

            try {
                AuthPrincipal principal = jwt.parseAndValidate(token);

                List<SimpleGrantedAuthority> authorities = new ArrayList<SimpleGrantedAuthority>();
                for (Role r : principal.roles()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + r.name()));
                }

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);

            } catch (Exception ex) {
                // Invalid token -> clear context and continue; entry point will return 401 for protected endpoints
                logger.warn("JWT invalid: {"+ex.getMessage()+"}");
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
