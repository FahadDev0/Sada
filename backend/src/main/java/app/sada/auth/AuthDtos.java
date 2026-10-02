package app.sada.auth;

import app.sada.user.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(min = 8, max = 100) String password) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record GoogleLoginRequest(@NotBlank String credential) {
    }

    public record UpdateProfileRequest(@NotBlank @Size(max = 120) String name) {
    }

    public record AuthResponse(String token, UserDto user) {
    }
}
