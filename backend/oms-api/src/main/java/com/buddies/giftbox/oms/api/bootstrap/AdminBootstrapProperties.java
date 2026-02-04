package com.buddies.giftbox.oms.api.bootstrap;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.bootstrap.admin")
public class AdminBootstrapProperties {

    private boolean enabled = true;
    private String email = "admin@local";
    private String password = "Admin@1234";
    private String sampleEmail = "user@local";
    private String samplePassword = "User@1234";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getSampleEmail() {
        return sampleEmail;
    }

    public void setSampleEmail(String sampleEmail) {
        this.sampleEmail = sampleEmail;
    }

    public String getSamplePassword() {
        return samplePassword;
    }

    public void setSamplePassword(String samplePassword) {
        this.samplePassword = samplePassword;
    }
}
