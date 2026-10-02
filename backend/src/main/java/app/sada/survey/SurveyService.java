package app.sada.survey;

import app.sada.common.ApiException;
import app.sada.response.SurveyResponseRepository;
import app.sada.survey.SurveyDtos.PublicSurveyDto;
import app.sada.survey.SurveyDtos.QuestionDto;
import app.sada.survey.SurveyDtos.QuestionInput;
import app.sada.survey.SurveyDtos.SurveyDto;
import app.sada.survey.SurveyDtos.SurveySummaryDto;
import app.sada.survey.SurveyDtos.SurveyUpsertRequest;
import app.sada.user.User;
import app.sada.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class SurveyService {

    private static final String SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
    private static final int SLUG_LENGTH = 8;
    private static final int MAX_SURVEYS_PER_USER = 200;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SurveyRepository surveys;
    private final SurveyResponseRepository responses;
    private final UserRepository users;

    public SurveyService(SurveyRepository surveys, SurveyResponseRepository responses, UserRepository users) {
        this.surveys = surveys;
        this.responses = responses;
        this.users = users;
    }

    // ---------------------------------------------------------------- queries

    @Transactional(readOnly = true)
    public List<SurveySummaryDto> list(UUID ownerId) {
        Map<UUID, Long> responseCounts = toCountMap(responses.countByOwnerGrouped(ownerId));
        Map<UUID, Long> questionCounts = toCountMap(surveys.countQuestionsByOwnerGrouped(ownerId));
        return surveys.findByOwnerIdOrderByUpdatedAtDesc(ownerId).stream()
                .map(s -> new SurveySummaryDto(s.getId(), s.getSlug(), s.getTitle(), s.getLanguage(), s.getStatus(),
                        s.getThemeColor(), questionCounts.getOrDefault(s.getId(), 0L).intValue(),
                        responseCounts.getOrDefault(s.getId(), 0L),
                        s.getClosesAt(), s.getCreatedAt(), s.getUpdatedAt()))
                .toList();
    }

    private static Map<UUID, Long> toCountMap(List<Object[]> rows) {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    @Transactional(readOnly = true)
    public SurveyDto get(UUID ownerId, UUID surveyId) {
        Survey survey = owned(ownerId, surveyId);
        return SurveyDto.of(survey, responses.countBySurveyId(surveyId));
    }

    /** Loads a survey the caller owns, or 404 (never 403, so ids can't be probed). */
    @Transactional(readOnly = true)
    public Survey owned(UUID ownerId, UUID surveyId) {
        return surveys.findByIdAndOwnerId(surveyId, ownerId).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public PublicSurveyDto getPublic(String slug) {
        Survey survey = surveys.findBySlug(slug)
                .filter(s -> s.getStatus() != SurveyStatus.DRAFT)
                .orElseThrow(ApiException::notFound);
        boolean accepting = survey.acceptsResponsesAt(Instant.now());
        List<QuestionDto> questions = accepting
                ? survey.getQuestions().stream().map(QuestionDto::of).toList()
                : List.of();
        return new PublicSurveyDto(survey.getSlug(), survey.getTitle(), survey.getDescription(), survey.getLanguage(),
                survey.getThemeColor(), survey.getThankYouMessage(), survey.isOneResponsePerDevice(), accepting, questions);
    }

    // ---------------------------------------------------------------- commands

    @Transactional
    public SurveyDto create(UUID ownerId, SurveyUpsertRequest request) {
        User owner = users.findById(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Account not found"));
        if (surveys.countByOwnerId(ownerId) >= MAX_SURVEYS_PER_USER) {
            throw ApiException.badRequest("SURVEY_LIMIT", "You have reached the maximum number of surveys");
        }
        Survey survey = new Survey();
        survey.setOwner(owner);
        survey.setSlug(newSlug());
        applyFields(survey, request);
        applyQuestions(survey, request.questions());
        surveys.saveAndFlush(survey);
        return SurveyDto.of(survey, 0);
    }

    @Transactional
    public SurveyDto update(UUID ownerId, UUID surveyId, SurveyUpsertRequest request) {
        Survey survey = owned(ownerId, surveyId);
        applyFields(survey, request);
        applyQuestions(survey, request.questions());
        survey.setUpdatedAt(Instant.now());
        // The survey is managed: flushing cascades PERSIST to new questions and assigns their ids.
        surveys.flush();
        return SurveyDto.of(survey, responses.countBySurveyId(surveyId));
    }

    @Transactional
    public SurveyDto setStatus(UUID ownerId, UUID surveyId, SurveyStatus status) {
        Survey survey = owned(ownerId, surveyId);
        if (status == SurveyStatus.PUBLISHED) {
            if (survey.getQuestions().isEmpty()) {
                throw ApiException.badRequest("NO_QUESTIONS", "Add at least one question before publishing");
            }
            if (survey.getClosesAt() != null && !survey.getClosesAt().isAfter(Instant.now())) {
                survey.setClosesAt(null); // re-opening an expired survey
            }
        }
        survey.setStatus(status);
        survey.setUpdatedAt(Instant.now());
        return SurveyDto.of(survey, responses.countBySurveyId(surveyId));
    }

    @Transactional
    public SurveyDto duplicate(UUID ownerId, UUID surveyId) {
        Survey source = owned(ownerId, surveyId);
        Survey copy = new Survey();
        copy.setOwner(source.getOwner());
        copy.setSlug(newSlug());
        String suffix = "en".equals(source.getLanguage()) ? " (copy)" : " (نسخة)";
        String title = source.getTitle() + suffix;
        copy.setTitle(title.length() > 200 ? title.substring(0, 200) : title);
        copy.setDescription(source.getDescription());
        copy.setLanguage(source.getLanguage());
        copy.setThemeColor(source.getThemeColor());
        copy.setThankYouMessage(source.getThankYouMessage());
        copy.setOneResponsePerDevice(source.isOneResponsePerDevice());
        copy.setStatus(SurveyStatus.DRAFT);
        int order = 0;
        for (Question q : source.getQuestions()) {
            Question c = new Question();
            c.setSurvey(copy);
            c.setSortOrder(order++);
            c.setType(q.getType());
            c.setTitle(q.getTitle());
            c.setDescription(q.getDescription());
            c.setRequired(q.isRequired());
            c.setOptions(new ArrayList<>(q.getOptions()));
            c.setSettings(q.getSettings());
            copy.getQuestions().add(c);
        }
        surveys.saveAndFlush(copy);
        return SurveyDto.of(copy, 0);
    }

    @Transactional
    public void delete(UUID ownerId, UUID surveyId) {
        surveys.delete(owned(ownerId, surveyId));
    }

    // ---------------------------------------------------------------- helpers

    private void applyFields(Survey survey, SurveyUpsertRequest request) {
        survey.setTitle(request.title().trim());
        survey.setDescription(blankToNull(request.description()));
        survey.setLanguage(request.language() == null ? "ar" : request.language());
        if (request.themeColor() != null) {
            survey.setThemeColor(request.themeColor().toLowerCase());
        }
        survey.setThankYouMessage(blankToNull(request.thankYouMessage()));
        survey.setOneResponsePerDevice(Boolean.TRUE.equals(request.oneResponsePerDevice()));
        survey.setClosesAt(request.closesAt());
    }

    /**
     * Reconciles the question list. Questions whose id matches an existing one are updated
     * in place so responses stay linked; the rest are created; missing ones are removed.
     */
    private void applyQuestions(Survey survey, List<QuestionInput> inputs) {
        List<QuestionInput> list = inputs == null ? List.of() : inputs;
        Map<UUID, Question> existing = new HashMap<>();
        for (Question q : survey.getQuestions()) {
            existing.put(q.getId(), q);
        }

        Set<UUID> kept = new HashSet<>();
        List<Question> created = new ArrayList<>();
        for (int i = 0; i < list.size(); i++) {
            QuestionSpec spec = normalize(list.get(i), i);
            UUID id = parseUuid(list.get(i).id());
            Question target = id != null && existing.containsKey(id) && !kept.contains(id) ? existing.get(id) : null;
            if (target == null) {
                target = new Question();
                target.setSurvey(survey);
                created.add(target);
            } else {
                kept.add(id);
            }
            spec.applyTo(target, i);
        }

        survey.getQuestions().removeIf(q -> q.getId() != null && !kept.contains(q.getId()));
        survey.getQuestions().addAll(created);
        survey.getQuestions().sort(Comparator.comparingInt(Question::getSortOrder));
    }

    /** A validated, normalised question definition. Shared with the AI generator. */
    public record QuestionSpec(QuestionType type, String title, String description, boolean required,
                               List<String> options, QuestionSettings settings) {

        void applyTo(Question q, int order) {
            q.setSortOrder(order);
            q.setType(type);
            q.setTitle(title);
            q.setDescription(description);
            q.setRequired(required);
            q.setOptions(new ArrayList<>(options));
            q.setSettings(settings);
        }
    }

    public static QuestionSpec normalize(QuestionInput in, int index) {
        String title = in.title() == null ? "" : in.title().trim();
        if (title.isEmpty()) {
            throw validation(index, "title", "REQUIRED");
        }
        if (title.length() > 500) {
            title = title.substring(0, 500);
        }
        QuestionType type = in.type();
        if (type == null) {
            throw validation(index, "type", "REQUIRED");
        }

        List<String> options = List.of();
        if (type.isChoice()) {
            LinkedHashSet<String> unique = new LinkedHashSet<>();
            if (in.options() != null) {
                for (String option : in.options()) {
                    if (option != null && !option.isBlank()) {
                        String trimmed = option.trim();
                        unique.add(trimmed.length() > 200 ? trimmed.substring(0, 200) : trimmed);
                    }
                }
            }
            if (unique.isEmpty()) {
                throw validation(index, "options", "CHOICE_NEEDS_OPTIONS");
            }
            options = new ArrayList<>(unique).subList(0, Math.min(unique.size(), 50));
        }

        QuestionSettings s = in.settings() == null ? QuestionSettings.EMPTY : in.settings();
        QuestionSettings settings = switch (type) {
            case RATING -> new QuestionSettings(1, clamp(s.max(), 5, 3, 10), null, null);
            case SCALE -> {
                int min = clamp(s.min(), 1, 0, 1);
                int max = clamp(s.max(), 5, min + 2, 10);
                yield new QuestionSettings(min, max, label(s.minLabel()), label(s.maxLabel()));
            }
            case NUMBER -> {
                Integer min = s.min();
                Integer max = s.max();
                if (min != null && max != null && min > max) {
                    Integer t = min;
                    min = max;
                    max = t;
                }
                yield new QuestionSettings(min, max, null, null);
            }
            default -> QuestionSettings.EMPTY;
        };

        String description = blankToNull(in.description());
        if (description != null && description.length() > 1000) {
            description = description.substring(0, 1000);
        }
        return new QuestionSpec(type, title, description, Boolean.TRUE.equals(in.required()), List.copyOf(options), settings);
    }

    private static ApiException validation(int index, String field, String code) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Question " + (index + 1) + " is invalid",
                Map.of("questions[" + index + "]." + field, code));
    }

    private static int clamp(Integer value, int fallback, int min, int max) {
        int v = value == null ? fallback : value;
        return Math.max(min, Math.min(max, v));
    }

    private static String label(String value) {
        String v = blankToNull(value);
        return v != null && v.length() > 60 ? v.substring(0, 60) : v;
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static UUID parseUuid(String value) {
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String newSlug() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(SLUG_LENGTH);
            for (int i = 0; i < SLUG_LENGTH; i++) {
                sb.append(SLUG_ALPHABET.charAt(RANDOM.nextInt(SLUG_ALPHABET.length())));
            }
            String slug = sb.toString();
            if (!surveys.existsBySlug(slug)) {
                return slug;
            }
        }
        throw new IllegalStateException("Could not allocate a unique slug");
    }

    /** Creates a survey from already-normalised parts (used by the AI generator). */
    @Transactional
    public SurveyDto createFromSpecs(UUID ownerId, String title, String description, String language,
                                     List<QuestionSpec> specs) {
        User owner = users.findById(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Account not found"));
        Survey survey = new Survey();
        survey.setOwner(owner);
        survey.setSlug(newSlug());
        String t = title == null || title.isBlank() ? "Untitled" : title.trim();
        survey.setTitle(t.length() > 200 ? t.substring(0, 200) : t);
        String d = blankToNull(description);
        survey.setDescription(d != null && d.length() > 2000 ? d.substring(0, 2000) : d);
        survey.setLanguage("en".equals(language) ? "en" : "ar");
        for (int i = 0; i < specs.size(); i++) {
            Question q = new Question();
            q.setSurvey(survey);
            specs.get(i).applyTo(q, i);
            survey.getQuestions().add(q);
        }
        surveys.saveAndFlush(survey);
        return SurveyDto.of(survey, 0);
    }
}
