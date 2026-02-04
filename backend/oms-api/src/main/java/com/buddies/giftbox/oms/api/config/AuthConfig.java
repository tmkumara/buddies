package com.buddies.giftbox.oms.api.config;

import com.buddies.giftbox.oms.api.security.JwtProperties;
import com.buddies.giftbox.oms.application.auth.AuthTokenConfig;
import java.time.Clock;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuthConfig {

    @Bean
    public AuthTokenConfig authTokenConfig(JwtProperties jwtProperties) {
        return AuthTokenConfig.builder()
                .accessTokenTtl(Duration.ofMinutes(jwtProperties.getAccessTokenMinutes()))
                .refreshTokenTtl(Duration.ofDays(jwtProperties.getRefreshTokenDays()))
                .build();
    }

    @Bean
    public Clock systemClock() {
        return Clock.systemUTC();
    }
}
