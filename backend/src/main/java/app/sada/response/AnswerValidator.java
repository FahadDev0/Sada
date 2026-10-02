package app.sada.response;

import app.sada.common.ApiException;
import app.sada.survey.Question;
import app.sada.survey.QuestionSettings;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Validates raw answers against the survey's questions and returns a cleaned map
 * containing only known questions with normalised values:
 * text/choice/date → String, multiple choice → List&lt;String&gt;, rating/scale → Integer, number → Number.
 */
public final class AnswerValidator {

    static final int SHORT_TEXT_MAX = 500;
    static final int LONG_TEXT_MAX = 5000;

    private AnswerValidator() {
    }

    public static Map<String, Object> validate(List<Question> questions, Map<String, Object> raw) {
        Map<String, Object> input = raw == null ? Map.of() : raw;
        Map<String, Object> clean = new LinkedHashMap<>();
        Map<String, String> errors = new LinkedHashMap<>();

        for (Question q : questions) {
            String key = q.getId().toString();
            Object value = input.get(key);
            if (isEmpty(value)) {
                if (q.isRequired()) {
                    errors.put(key, "REQUIRED");
                }
                continue;
            }
            try {
                clean.put(key, normalise(q, value));
            } catch (InvalidAnswer e) {
                errors.put(key, e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ANSWERS", "Some answers need attention", errors);
        }
        if (clean.isEmpty()) {
            throw ApiException.badRequest("EMPTY_RESPONSE", "Answer at least one question");
        }
        return clean;
    }

    private static Object normalise(Question q, Object value) {
        QuestionSettings s = q.getSettings() == null ? QuestionSettings.EMPTY : q.getSettings();
        return switch (q.getType()) {
            case SHORT_TEXT -> text(value, SHORT_TEXT_MAX);
            case LONG_TEXT -> text(value, LONG_TEXT_MAX);
            case SINGLE_CHOICE, DROPDOWN -> {
                String choice = text(value, 200);
                if (!q.getOptions().contains(choice)) {
                    throw new InvalidAnswer("UNKNOWN_OPTION");
                }
                yield choice;
            }
            case MULTIPLE_CHOICE -> {
                if (!(value instanceof Collection<?> items)) {
                    throw new InvalidAnswer("EXPECTED_LIST");
                }
                LinkedHashSet<String> picked = new LinkedHashSet<>();
                for (Object item : items) {
                    String choice = text(item, 200);
                    if (!q.getOptions().contains(choice)) {
                        throw new InvalidAnswer("UNKNOWN_OPTION");
                    }
                    picked.add(choice);
                }
                // keep the survey's option order for consistent display/export
                List<String> ordered = new ArrayList<>();
                for (String option : q.getOptions()) {
                    if (picked.contains(option)) {
                        ordered.add(option);
                    }
                }
                yield ordered;
            }
            case RATING -> integerInRange(value, 1, s.max() == null ? 5 : s.max());
            case SCALE -> integerInRange(value, s.min() == null ? 1 : s.min(), s.max() == null ? 5 : s.max());
            case NUMBER -> {
                double number = number(value);
                if ((s.min() != null && number < s.min()) || (s.max() != null && number > s.max())) {
                    throw new InvalidAnswer("OUT_OF_RANGE");
                }
                yield number == Math.rint(number) && Math.abs(number) < 1e15 ? (Object) (long) number : (Object) number;
            }
            case DATE -> {
                String date = text(value, 10);
                try {
                    LocalDate.parse(date);
                } catch (DateTimeParseException e) {
                    throw new InvalidAnswer("INVALID_DATE");
                }
                yield date;
            }
        };
    }

    private static boolean isEmpty(Object value) {
        return value == null
                || (value instanceof String s && s.isBlank())
                || (value instanceof Collection<?> c && c.isEmpty());
    }

    private static String text(Object value, int max) {
        if (!(value instanceof String s)) {
            throw new InvalidAnswer("EXPECTED_TEXT");
        }
        String trimmed = s.trim();
        if (trimmed.length() > max) {
            throw new InvalidAnswer("TOO_LONG");
        }
        return trimmed;
    }

    private static double number(Object value) {
        if (value instanceof Number n) {
            double d = n.doubleValue();
            if (Double.isNaN(d) || Double.isInfinite(d)) {
                throw new InvalidAnswer("EXPECTED_NUMBER");
            }
            return d;
        }
        if (value instanceof String s) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException e) {
                throw new InvalidAnswer("EXPECTED_NUMBER");
            }
        }
        throw new InvalidAnswer("EXPECTED_NUMBER");
    }

    private static int integerInRange(Object value, int min, int max) {
        double d = number(value);
        if (d != Math.rint(d) || d < min || d > max) {
            throw new InvalidAnswer("OUT_OF_RANGE");
        }
        return (int) d;
    }

    private static final class InvalidAnswer extends RuntimeException {
        InvalidAnswer(String code) {
            super(code, null, false, false);
        }
    }
}
