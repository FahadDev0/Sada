package app.sada.ai;

import app.sada.common.ApiException;
import app.sada.common.Json;
import app.sada.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.List;
import java.util.Map;

/**
 * Minimal Gemini REST client (generateContent with a JSON response schema).
 * Uses the JDK HTTP client so there is no SDK to keep in sync.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final String BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final AppProperties.Gemini config;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public GeminiClient(AppProperties props) {
        this.config = props.gemini();
    }

    public boolean enabled() {
        return config != null && config.enabled();
    }

    /** Sends the prompt and returns the model's JSON answer parsed into a map. */
    public Map<String, Object> generateJson(String systemPrompt, String userPrompt, Map<String, Object> schema) {
        if (!enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_DISABLED", "AI features are not configured");
        }
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", schema,
                        "temperature", 0.6));

        String model = config.model() == null || config.model().isBlank() ? "gemini-flash-latest" : config.model().trim();
        if (model.startsWith("models/")) {
            model = model.substring("models/".length());
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE + URLEncoder.encode(model, StandardCharsets.UTF_8) + ":generateContent"))
                .timeout(Duration.ofSeconds(90))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", config.apiKey().trim())
                .POST(HttpRequest.BodyPublishers.ofString(Json.write(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            log.warn("Gemini request failed: {}", e.toString());
            throw failed();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw failed();
        }

        if (response.statusCode() == 429) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "AI_BUSY", "The AI service is busy, try again shortly");
        }
        if (response.statusCode() / 100 != 2) {
            log.warn("Gemini returned {}: {}", response.statusCode(), abbreviate(response.body()));
            throw failed();
        }

        try {
            String text = extractText(Json.readMap(response.body()));
            return Json.readMap(stripFences(text));
        } catch (RuntimeException e) {
            log.warn("Could not parse Gemini response: {}", e.toString());
            throw failed();
        }
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
        return s == null ? "" : s.length() > 500 ? s.substring(0, 500) + "…" : s;
    }

    private static ApiException failed() {
        return new ApiException(HttpStatus.BAD_GATEWAY, "AI_FAILED", "The AI service could not complete the request");
    }
}
