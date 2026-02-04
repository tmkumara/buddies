package com.buddies.giftbox.oms.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(
        scanBasePackages = "com.buddies.giftbox.oms",
        exclude = UserDetailsServiceAutoConfiguration.class
)
@EntityScan(basePackages = "com.buddies.giftbox.oms.infrastructure")
@EnableJpaRepositories(basePackages = "com.buddies.giftbox.oms.infrastructure")
public class OmsApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(OmsApiApplication.class, args);
    }

}
