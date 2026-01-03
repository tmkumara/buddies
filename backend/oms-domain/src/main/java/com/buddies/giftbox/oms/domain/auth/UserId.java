package com.buddies.giftbox.oms.domain.auth;

import java.io.Serializable;
import java.util.Objects;

public final class UserId implements Serializable {
    private final Long value;

    public UserId(Long value) {
        if (value == null) {
            throw new IllegalArgumentException("UserId value cannot be null");
        }
        this.value = value;
    }

    public Long value() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserId)) return false;
        UserId userId = (UserId) o;
        return value.equals(userId.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return String.valueOf(value);
    }
}
