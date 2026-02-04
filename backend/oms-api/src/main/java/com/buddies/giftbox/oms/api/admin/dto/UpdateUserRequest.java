package com.buddies.giftbox.oms.api.admin.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private Boolean enabled;
}
