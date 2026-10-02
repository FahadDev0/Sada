package app.sada.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Hosting providers (Neon, Render, Supabase…) hand out connection strings like
 * {@code postgresql://user:pass@host/db?sslmode=require}. JDBC needs a different
 * shape, so this converts DATABASE_URL into Spring's datasource properties before
 * the context starts. System properties win over application.yml.
 */
public final class DatabaseUrl {

    private DatabaseUrl() {
    }

    public static void applyFromEnvironment() {
        String raw = System.getenv("DATABASE_URL");
        if (raw == null || raw.isBlank()) {
            return;
        }
        Parsed parsed = parse(raw);
        System.setProperty("spring.datasource.url", parsed.jdbcUrl());
        if (parsed.username() != null) {
            System.setProperty("spring.datasource.username", parsed.username());
        }
        if (parsed.password() != null) {
            System.setProperty("spring.datasource.password", parsed.password());
        }
    }

    public record Parsed(String jdbcUrl, String username, String password) {
    }

    public static Parsed parse(String raw) {
        String value = raw.trim();
        // People sometimes paste the whole "psql '...'" command from the Neon dashboard.
        if (value.startsWith("psql")) {
            value = value.substring(4).trim();
        }
        value = value.replaceAll("^['\"]+|['\"]+$", "");

        if (value.startsWith("jdbc:")) {
            return new Parsed(value, null, null);
        }

        URI uri = URI.create(value);
        String scheme = uri.getScheme();
        if (!"postgres".equals(scheme) && !"postgresql".equals(scheme)) {
            throw new IllegalStateException("DATABASE_URL must start with postgresql:// or jdbc:postgresql://");
        }

        String username = null;
        String password = null;
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null) {
            int colon = userInfo.indexOf(':');
            if (colon >= 0) {
                username = decode(userInfo.substring(0, colon));
                password = decode(userInfo.substring(colon + 1));
            } else {
                username = decode(userInfo);
            }
        }

        String host = uri.getHost();
        String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
        String database = uri.getRawPath() == null || uri.getRawPath().isBlank() ? "/postgres" : uri.getRawPath();

        List<String> params = new ArrayList<>();
        boolean hasSslMode = false;
        String query = uri.getRawQuery();
        if (query != null && !query.isBlank()) {
            for (String param : query.split("&")) {
                if (param.isBlank() || param.startsWith("channel_binding=")) {
                    continue; // libpq-only option, the JDBC driver negotiates this itself
                }
                if (param.startsWith("sslmode=")) {
                    hasSslMode = true;
                }
                params.add(param);
            }
        }
        boolean local = "localhost".equals(host) || "127.0.0.1".equals(host);
        if (!hasSslMode && !local) {
            params.add("sslmode=require");
        }

        String jdbcUrl = "jdbc:postgresql://" + host + port + database
                + (params.isEmpty() ? "" : "?" + String.join("&", params));
        return new Parsed(jdbcUrl, username, password);
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }
}
