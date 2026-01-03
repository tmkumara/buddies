CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       email VARCHAR(190) NOT NULL UNIQUE,
                       password_hash VARCHAR(120) NOT NULL,
                       active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE user_roles (
                            user_id BIGINT NOT NULL,
                            role VARCHAR(30) NOT NULL,
                            PRIMARY KEY (user_id, role),
                            CONSTRAINT fk_user_roles_user
                                FOREIGN KEY (user_id) REFERENCES users(id)
                                    ON DELETE CASCADE
);
