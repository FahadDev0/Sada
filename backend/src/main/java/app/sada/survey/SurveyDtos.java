package app.sada.survey;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SurveyDtos {

    private SurveyDtos() {
    }

    public record QuestionDto(
            UUID id,
            QuestionType type,
            String title,
            String description,
            boolean required,
            List<String> options,
            QuestionSettings settings) {

        public static QuestionDto of(Question q) {
            return new QuestionDto(q.getId(), q.getType(), q.getTitle(), q.getDescription(), q.isRequired(),
                    List.copyOf(q.getOptions()), q.getSettings());
        }
    }

    public record SurveyDto(
            UUID id,
            String slug,
            String title,
            String description,
            String language,
            SurveyStatus status,
            String themeColor,
            String thankYouMessage,
            boolean oneResponsePerDevice,
            Instant closesAt,
            Instant createdAt,
            Instant updatedAt,
            long responseCount,
            List<QuestionDto> questions) {

        public static SurveyDto of(Survey s, long responseCount) {
            return new SurveyDto(s.getId(), s.getSlug(), s.getTitle(), s.getDescription(), s.getLanguage(),
                    s.getStatus(), s.getThemeColor(), s.getThankYouMessage(), s.isOneResponsePerDevice(),
                    s.getClosesAt(), s.getCreatedAt(), s.getUpdatedAt(), responseCount,
                    s.getQuestions().stream().map(QuestionDto::of).toList());
        }
    }

    public record SurveySummaryDto(
            UUID id,
            String slug,
            String title,
            String language,
            SurveyStatus status,
            String themeColor,
            int questionCount,
            long responseCount,
            Instant closesAt,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record QuestionInput(
            /* Existing question id (keeps collected answers attached). Anything else creates a new question. */
            String id,
            @NotNull QuestionType type,
            @NotBlank @Size(max = 500) String title,
            @Size(max = 1000) String description,
            /* Boxed: Jackson 3 rejects missing primitives by default. */
            Boolean required,
            @Size(max = 50) List<@Size(max = 200) String> options,
            QuestionSettings settings) {
    }

    public record SurveyUpsertRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 2000) String description,
            @Pattern(regexp = "ar|en") String language,
            @Pattern(regexp = "#[0-9a-fA-F]{6}") String themeColor,
            @Size(max = 1000) String thankYouMessage,
            Boolean oneResponsePerDevice,
            Instant closesAt,
            @Valid @Size(max = 100) List<QuestionInput> questions) {
    }

    public record StatusRequest(@NotNull SurveyStatus status) {
    }

    /** What respondents see. Never exposes owner or internal fields. */
    public record PublicSurveyDto(
            String slug,
            String title,
            String description,
            String language,
            String themeColor,
            String thankYouMessage,
            boolean oneResponsePerDevice,
            boolean acceptingResponses,
            List<QuestionDto> questions) {
    }
}
