package com.buddies.giftbox.oms.api.common;

import java.time.Instant;
import java.util.Map;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ErrorResponse {
    Instant timestamp;
    int status;
    String error;
    String message;
    String path;
    String correlationId;
    Map<String, String> details;
}
