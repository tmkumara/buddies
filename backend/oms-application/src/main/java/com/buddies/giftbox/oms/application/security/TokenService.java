package com.buddies.giftbox.oms.application.security;

import com.buddies.giftbox.oms.domain.auth.User;

public interface TokenService {
    String createAccessToken(User user, long expiresInSeconds);
}
