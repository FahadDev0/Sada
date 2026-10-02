package app.sada.response;

import app.sada.survey.QuestionType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ResultsDtos {

    private ResultsDtos() {
    }

    public record SurveyResultsDto(
            UUID surveyId,
            long totalResponses,
            Instant firstResponseAt,
            Instant lastResponseAt,
            List<DayCount> timeline,
            List<QuestionResultDto> questions) {
    }

    public record DayCount(LocalDate date, long count) {
    }

    public record OptionCount(String label, long count, double percent) {
    }

    public record TextAnswer(String value, Instant submittedAt) {
    }

    public record QuestionResultDto(
            UUID questionId,
            QuestionType type,
            String title,
            long answered,
            long skipped,
            /* choice counts, or the value distribution for rating/scale */
            List<OptionCount> options,
            Double average,
            Double min,
            Double max,
            /* Net Promoter Score, only for 0–10 scales */
            Integer nps,
            /* most recent free-text (and date) answers */
            List<TextAnswer> textAnswers) {
    }

    public record ResponseDto(UUID id, Instant submittedAt, Map<String, Object> answers) {
    }

    public record PageDto<T>(List<T> items, long total, int page, int size) {
    }

    public record SubmitRequest(Map<String, Object> answers) {
    }

    public record SubmitResult(UUID id, String thankYouMessage) {
    }
}
