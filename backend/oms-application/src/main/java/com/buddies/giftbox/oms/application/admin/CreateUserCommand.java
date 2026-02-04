package com.buddies.giftbox.oms.application.admin;

import java.util.Set;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CreateUserCommand {
    String email;
    String password;
    String fullName;
    boolean enabled;
    Set<String> roleNames;
}
