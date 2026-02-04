package com.buddies.giftbox.oms.api.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthFlowIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("oms_test")
            .withUsername("oms")
            .withPassword("oms");

    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("security.jwt.secret", () -> "c3VwZXItc2VjcmV0LXRlc3Q=");
        registry.add("app.bootstrap.admin.enabled", () -> "true");
        registry.add("app.bootstrap.admin.email", () -> "admin@local");
        registry.add("app.bootstrap.admin.password", () -> "Admin@1234");
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void login_and_refresh_should_work() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "admin@local",
                                  "password": "Admin@1234"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token.accessToken").exists())
                .andExpect(cookie().exists("refresh_token"));

        String refreshCookie = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "admin@local",
                                  "password": "Admin@1234"
                                }
                                """))
                .andReturn()
                .getResponse()
                .getHeader("Set-Cookie");

        mockMvc.perform(post("/api/auth/refresh")
                        .header("Cookie", refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token.accessToken").exists());
    }
}
