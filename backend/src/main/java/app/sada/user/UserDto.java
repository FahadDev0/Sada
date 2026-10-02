package app.sada.user;

import java.util.UUID;

public record UserDto(UUID id, String name, String email, String avatarUrl, boolean googleLinked) {

    public static UserDto of(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getAvatarUrl(), user.getGoogleSub() != null);
    }
}
