package app.sada.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public, unauthenticated runtime configuration for the frontend. */
@RestController
public class ConfigController {

    public record PublicConfig(String googleClientId, boolean googleEnabled, boolean aiEnabled) {
    }

    private final AppProperties props;

    public ConfigController(AppProperties props) {
        this.props = props;
    }

    @GetMapping("/api/config")
    public PublicConfig config() {
        return new PublicConfig(
                props.googleEnabled() ? props.googleClientId() : null,
                props.googleEnabled(),
                props.gemini() != null && props.gemini().enabled());
    }
}
