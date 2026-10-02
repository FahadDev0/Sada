package app.sada.response;

import app.sada.response.ResultsDtos.DayCount;
import app.sada.response.ResultsDtos.OptionCount;
import app.sada.response.ResultsDtos.QuestionResultDto;
import app.sada.response.ResultsDtos.SurveyResultsDto;
import app.sada.response.ResultsDtos.TextAnswer;
import app.sada.survey.Question;
import app.sada.survey.QuestionSettings;
import app.sada.survey.QuestionType;
import app.sada.survey.Survey;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Pure aggregation over a survey's responses (oldest first). */
public final class ResultsCalculator {

    static final int TEXT_SAMPLE = 100;
    static final int MAX_TIMELINE_DAYS = 120;

    private ResultsCalculator() {
    }

    public static SurveyResultsDto compute(Survey survey, List<SurveyResponse> responses, ZoneId zone) {
        long total = responses.size();
        Instant first = responses.isEmpty() ? null : responses.getFirst().getSubmittedAt();
        Instant last = responses.isEmpty() ? null : responses.getLast().getSubmittedAt();

        List<QuestionResultDto> questions = new ArrayList<>();
        for (Question q : survey.getQuestions()) {
            questions.add(forQuestion(q, responses));
        }
        return new SurveyResultsDto(survey.getId(), total, first, last, timeline(responses, zone), questions);
    }

    private static List<DayCount> timeline(List<SurveyResponse> responses, ZoneId zone) {
        if (responses.isEmpty()) {
            return List.of();
        }
        TreeMap<LocalDate, Long> perDay = new TreeMap<>();
        for (SurveyResponse r : responses) {
            perDay.merge(r.getSubmittedAt().atZone(zone).toLocalDate(), 1L, Long::sum);
        }
        LocalDate end = perDay.lastKey();
        LocalDate start = perDay.firstKey();
        if (ChronoUnit.DAYS.between(start, end) > MAX_TIMELINE_DAYS) {
            start = end.minusDays(MAX_TIMELINE_DAYS);
        }
        // pad to at least a week so a brand-new survey still draws a sensible chart
        if (ChronoUnit.DAYS.between(start, end) < 6) {
            start = end.minusDays(6);
        }
        List<DayCount> days = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            days.add(new DayCount(d, perDay.getOrDefault(d, 0L)));
        }
        return days;
    }

    private static QuestionResultDto forQuestion(Question q, List<SurveyResponse> responses) {
        String key = q.getId().toString();
        QuestionType type = q.getType();
        QuestionSettings s = q.getSettings() == null ? QuestionSettings.EMPTY : q.getSettings();

        long answered = 0;
        Map<String, Long> counts = new LinkedHashMap<>();
        if (type.isChoice()) {
            for (String option : q.getOptions()) {
                counts.put(option, 0L);
            }
        } else if (type == QuestionType.RATING || type == QuestionType.SCALE) {
            int min = type == QuestionType.RATING ? 1 : (s.min() == null ? 1 : s.min());
            int max = s.max() == null ? 5 : s.max();
            for (int v = min; v <= max; v++) {
                counts.put(String.valueOf(v), 0L);
            }
        }

        double sum = 0;
        Double min = null;
        Double max = null;
        long promoters = 0;
        long detractors = 0;
        List<TextAnswer> texts = new ArrayList<>();

        // newest first for text samples
        for (int i = responses.size() - 1; i >= 0; i--) {
            SurveyResponse r = responses.get(i);
            Object value = r.getAnswers() == null ? null : r.getAnswers().get(key);
            if (value == null) {
                continue;
            }
            answered++;
            switch (type) {
                case SINGLE_CHOICE, DROPDOWN -> counts.merge(String.valueOf(value), 1L, Long::sum);
                case MULTIPLE_CHOICE -> {
                    if (value instanceof Collection<?> items) {
                        for (Object item : items) {
                            counts.merge(String.valueOf(item), 1L, Long::sum);
                        }
                    }
                }
                case RATING, SCALE, NUMBER -> {
                    if (value instanceof Number n) {
                        double d = n.doubleValue();
                        sum += d;
                        min = min == null ? d : Math.min(min, d);
                        max = max == null ? d : Math.max(max, d);
                        if (type != QuestionType.NUMBER) {
                            counts.merge(String.valueOf(n.intValue()), 1L, Long::sum);
                        }
                        if (d >= 9) {
                            promoters++;
                        } else if (d <= 6) {
                            detractors++;
                        }
                    }
                }
                case SHORT_TEXT, LONG_TEXT, DATE -> {
                    if (texts.size() < TEXT_SAMPLE) {
                        texts.add(new TextAnswer(String.valueOf(value), r.getSubmittedAt()));
                    }
                }
            }
        }

        List<OptionCount> options = new ArrayList<>();
        if (!counts.isEmpty()) {
            for (Map.Entry<String, Long> e : counts.entrySet()) {
                double percent = answered == 0 ? 0 : round1(e.getValue() * 100.0 / answered);
                options.add(new OptionCount(e.getKey(), e.getValue(), percent));
            }
        }

        boolean numeric = type == QuestionType.RATING || type == QuestionType.SCALE || type == QuestionType.NUMBER;
        Double average = numeric && answered > 0 ? round2(sum / answered) : null;
        Integer nps = null;
        if (type == QuestionType.SCALE && Integer.valueOf(0).equals(s.min()) && Integer.valueOf(10).equals(s.max()) && answered > 0) {
            nps = (int) Math.round((promoters - detractors) * 100.0 / answered);
        }

        return new QuestionResultDto(q.getId(), type, q.getTitle(), answered, responses.size() - answered,
                options, average, numeric ? min : null, numeric ? max : null, nps, texts);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
