package app.sada.security;

import app.sada.common.ApiException;
import app.sada.config.AppProperties;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Verifies Google Identity Services ID tokens (the "credential" returned by the
 * Sign in with Google button) locally against Google's published keys.
 */
@Component
public class GoogleTokenVerifier {

    private static final String GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    public record GoogleUser(String subject, String email, String name, String picture) {
    }

    private final AppProperties props;
    private volatile JwtDecoder decoder;

    public GoogleTokenVerifier(AppProperties props) {
        this.props = props;
    }

    public GoogleUser verify(String idToken) {
        if (!props.googleEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "GOOGLE_DISABLED", "Google sign-in is not configured");
        }
        Jwt jwt;
        try {
            jwt = decoder().decode(idToken);
        } catch (JwtException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "GOOGLE_INVALID", "Invalid Google credential");
        }
        Object verified = jwt.getClaims().get("email_verified");
        boolean emailVerified = Boolean.TRUE.equals(verified) || "true".equals(String.valueOf(verified));
        String email = jwt.getClaimAsString("email");
        if (!emailVerified || email == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "GOOGLE_INVALID", "Google account email is not verified");
        }
        return new GoogleUser(jwt.getSubject(), email, jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
    }

    private JwtDecoder decoder() {
        JwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                current = decoder;
                if (current == null) {
                    current = buildDecoder();
                    decoder = current;
                }
            }
        }
        return current;
    }

    private JwtDecoder buildDecoder() {
        String clientId = props.googleClientId().trim();
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS).build();

        OAuth2TokenValidator<Jwt> issuer = jwt -> ISSUERS.contains(jwt.getClaimAsString("iss"))
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Unexpected issuer", null));

        OAuth2TokenValidator<Jwt> audience = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.contains(clientId)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Unexpected audience", null));
        };

        nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), issuer, audience));
        return nimbus;
    }
}
