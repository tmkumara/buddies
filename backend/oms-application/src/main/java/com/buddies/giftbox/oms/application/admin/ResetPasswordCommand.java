package com.buddies.giftbox.oms.application.admin;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ResetPasswordCommand {
    String newPassword;
}
