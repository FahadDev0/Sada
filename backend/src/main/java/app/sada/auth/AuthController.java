package app.sada.auth;

import app.sada.auth.AuthDtos.AuthResponse;
import app.sada.auth.AuthDtos.GoogleLoginRequest;
import app.sada.auth.AuthDtos.LoginRequest;
import app.sada.auth.AuthDtos.RegisterRequest;
import app.sada.auth.AuthDtos.UpdateProfileRequest;
import app.sada.common.ApiException;
import app.sada.common.ClientIp;
import app.sada.common.RateLimiter;
import app.sada.config.AppProperties;
import app.sada.security.CurrentUser;
import app.sada.user.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimiter rateLimiter;
    private final int attemptsPerMinute;

    public AuthController(AuthService authService, RateLimiter rateLimiter, AppProperties props) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
        this.attemptsPerMinute = props.limits() == null ? 10 : props.limits().authPerMinute();
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        throttle(http);
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        throttle(http);
        return authService.login(request);
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest http) {
        throttle(http);
        return authService.google(request);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return authService.me(CurrentUser.id(jwt));
    }

    @PatchMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(CurrentUser.id(jwt), request.name());
    }

    private void throttle(HttpServletRequest http) {
        if (!rateLimiter.tryAcquire("auth:" + ClientIp.of(http), attemptsPerMinute, Duration.ofMinutes(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Too many attempts, try again in a minute");
        }
    }
}
