package com.buddies.giftbox.oms.api.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import lombok.Data;

@Data
public class CreateUserRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;

    private String fullName;

    private boolean enabled = true;

    private Set<String> roleNames;
}
