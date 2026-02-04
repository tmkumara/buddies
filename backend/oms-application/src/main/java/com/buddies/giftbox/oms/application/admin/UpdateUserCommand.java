package com.buddies.giftbox.oms.application.admin;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UpdateUserCommand {
    String fullName;
    Boolean enabled;
}
