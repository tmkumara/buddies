package com.buddies.giftbox.oms.api.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank
    private String newPassword;
}
