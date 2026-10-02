package app.sada.ai;

import app.sada.common.ApiException;
import app.sada.common.Json;
import app.sada.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Minimal Gemini REST client (generateContent with a JSON response schema).
 * Uses the JDK HTTP client so there is no SDK to keep in sync.
 *
 * <p>Gemini regularly answers 503 "high demand" or 429 on the free tier. Each model
 * gets a couple of quick retries; if it stays busy (or doesn't exist for this key),
 * the next model in GEMINI_FALLBACK_MODELS is tried.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final String BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final Set<Integer> TRANSIENT = Set.of(429, 500, 502, 503, 504);
    private static final int ATTEMPTS_PER_MODEL = 2;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(60);

    private final AppProperties.Gemini config;
    private final List<String> models;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public GeminiClient(AppProperties props,
                        @Value("${app.gemini.fallback-models:gemini-3.5-flash-lite,gemini-3.1-flash-lite}") String fallbacks) {
        this.config = props.gemini();
        LinkedHashSet<String> ordered = new LinkedHashSet<>();
        String primary = config == null || config.model() == null || config.model().isBlank()
                ? "gemini-flash-latest" : config.model();
        ordered.add(normalise(primary));
        if (fallbacks != null) {
            for (String m : fallbacks.split(",")) {
                if (!m.isBlank()) {
                    ordered.add(normalise(m));
                }
            }
        }
        this.models = List.copyOf(ordered);
    }

    public boolean enabled() {
        return config != null && config.enabled();
    }

    /** Sends the prompt and returns the model's JSON answer parsed into a map. */
    public Map<String, Object> generateJson(String systemPrompt, String userPrompt, Map<String, Object> schema) {
        if (!enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_DISABLED", "AI features are not configured");
        }
        String body = Json.write(Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", schema,
                        "temperature", 0.6)));

        boolean sawBusy = false;
        List<String> failures = new ArrayList<>();
        for (String model : models) {
            for (int attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
                HttpResponse<String> response;
                try {
                    response = send(model, body);
                } catch (IOException e) {
                    failures.add(model + ": " + e.getClass().getSimpleName());
                    sawBusy = true;
                    if (attempt < ATTEMPTS_PER_MODEL) {
                        pause(attempt);
                        continue;
                    }
                    break;
                }

                int status = response.statusCode();
                if (status / 100 == 2) {
                    try {
                        String text = extractText(Json.readMap(response.body()));
                        if (!model.equals(models.getFirst())) {
                            log.info("Gemini answered with fallback model {}", model);
                        }
                        return Json.readMap(stripFences(text));
                    } catch (RuntimeException e) {
                        // Malformed or empty output: try once more, then move on.
                        failures.add(model + ": unparseable response");
                        log.warn("Could not parse Gemini response from {}: {}", model, e.toString());
                        continue;
                    }
                }

                failures.add(model + ": HTTP " + status);
                if (TRANSIENT.contains(status)) {
                    sawBusy = true;
                    log.warn("Gemini {} returned {} (attempt {}/{})", model, status, attempt, ATTEMPTS_PER_MODEL);
                    if (attempt < ATTEMPTS_PER_MODEL) {
                        pause(attempt);
                        continue;
                    }
                } else {
                    // 400/403/404: usually this model isn't available for the key — try the next one.
                    log.warn("Gemini {} returned {}: {}", model, status, abbreviate(response.body()));
                }
                break;
            }
        }

        log.warn("All Gemini models failed: {}", failures);
        if (sawBusy) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "AI_BUSY", "The AI service is busy, try again shortly");
        }
        throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_FAILED", "The AI service could not complete the request");
    }

    private HttpResponse<String> send(String model, String body) throws IOException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE + URLEncoder.encode(model, StandardCharsets.UTF_8) + ":generateContent"))
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", config.apiKey().trim())
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("interrupted", e);
        }
    }

    private static void pause(int attempt) {
        try {
            Thread.sleep(1000L * attempt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String normalise(String model) {
        String m = model.trim();
        return m.startsWith("models/") ? m.substring("models/".length()) : m;
    }

    @SuppressWarnings("unchecked")
    private static String extractText(Map<String, Object> root) {
        List<Object> candidates = (List<Object>) root.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException("no candidates");
        }
        Map<String, Object> content = (Map<String, Object>) ((Map<String, Object>) candidates.getFirst()).get("content");
        List<Object> parts = (List<Object>) content.get("parts");
        StringBuilder text = new StringBuilder();
        for (Object p : parts) {
            Map<String, Object> part = (Map<String, Object>) p;
            if (!Boolean.TRUE.equals(part.get("thought")) && part.get("text") != null) {
                text.append(part.get("text"));
            }
        }
        if (text.isEmpty()) {
            throw new IllegalStateException("empty text");
        }
        return text.toString();
    }

    private static String stripFences(String text) {
        String t = text.trim();
        if (t.startsWith("```")) {
            int firstNewline = t.indexOf('\n');
            int lastFence = t.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                t = t.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return t;
    }

    private static String abbreviate(String s) {
        return s == null ? "" : s.length() > 300 ? s.substring(0, 300) + "…" : s;
    }
}
