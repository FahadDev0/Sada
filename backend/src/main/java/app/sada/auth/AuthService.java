package app.sada.auth;

import app.sada.auth.AuthDtos.AuthResponse;
import app.sada.auth.AuthDtos.GoogleLoginRequest;
import app.sada.auth.AuthDtos.LoginRequest;
import app.sada.auth.AuthDtos.RegisterRequest;
import app.sada.common.ApiException;
import app.sada.security.GoogleTokenVerifier;
import app.sada.security.GoogleTokenVerifier.GoogleUser;
import app.sada.security.JwtService;
import app.sada.user.User;
import app.sada.user.UserDto;
import app.sada.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleVerifier;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder,
                       JwtService jwtService, GoogleTokenVerifier googleVerifier) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleVerifier = googleVerifier;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "An account with this email already exists");
        }
        User user = new User();
        user.setEmail(email);
        user.setName(request.name().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        users.save(user);
        return new AuthResponse(jwtService.issue(user), UserDto.of(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(normalizeEmail(request.email()))
                .filter(u -> u.getPasswordHash() != null)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Wrong email or password"));
        return new AuthResponse(jwtService.issue(user), UserDto.of(user));
    }

    @Transactional
    public AuthResponse google(GoogleLoginRequest request) {
        GoogleUser google = googleVerifier.verify(request.credential());
        String email = normalizeEmail(google.email());

        User user = users.findByGoogleSub(google.subject())
                .or(() -> users.findByEmail(email))
                .orElseGet(() -> {
                    User created = new User();
                    created.setEmail(email);
                    created.setName(google.name() == null || google.name().isBlank() ? email.split("@")[0] : google.name());
                    return created;
                });
        // Link (or refresh) the Google identity. Google verified the email, so linking an
        // existing password account with the same address is safe.
        user.setGoogleSub(google.subject());
        if (google.picture() != null) {
            user.setAvatarUrl(google.picture());
        }
        users.save(user);
        return new AuthResponse(jwtService.issue(user), UserDto.of(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(UUID userId) {
        return users.findById(userId)
                .map(UserDto::of)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Account not found"));
    }

    @Transactional
    public UserDto updateProfile(UUID userId, String name) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Account not found"));
        user.setName(name.trim());
        return UserDto.of(user);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
