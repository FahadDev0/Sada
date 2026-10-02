package app.sada.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String jwtSecret,
        Duration jwtTtl,
        List<String> corsAllowedOrigins,
        String googleClientId,
        Gemini gemini,
        Limits limits
) {

    /** Per-IP request limits (fixed one-minute windows). */
    public record Limits(int authPerMinute, int submissionsPerMinute) {
    }

    public record Gemini(String apiKey, String model, int dailyLimit) {

        public boolean enabled() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public boolean googleEnabled() {
        return googleClientId != null && !googleClientId.isBlank();
    }
}
