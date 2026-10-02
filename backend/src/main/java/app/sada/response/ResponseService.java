package app.sada.response;

import app.sada.common.ApiException;
import app.sada.response.ResultsDtos.PageDto;
import app.sada.response.ResultsDtos.ResponseDto;
import app.sada.response.ResultsDtos.SubmitResult;
import app.sada.response.ResultsDtos.SurveyResultsDto;
import app.sada.survey.Question;
import app.sada.survey.Survey;
import app.sada.survey.SurveyRepository;
import app.sada.survey.SurveyService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ResponseService {

    /** Guard rail for the free database tier. */
    static final long MAX_RESPONSES_PER_SURVEY = 10_000;
    private static final DateTimeFormatter CSV_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final SurveyRepository surveys;
    private final SurveyResponseRepository responses;
    private final SurveyService surveyService;

    public ResponseService(SurveyRepository surveys, SurveyResponseRepository responses, SurveyService surveyService) {
        this.surveys = surveys;
        this.responses = responses;
        this.surveyService = surveyService;
    }

    @Transactional
    public SubmitResult submit(String slug, Map<String, Object> rawAnswers) {
        Survey survey = surveys.findBySlug(slug)
                .filter(s -> s.getStatus() != app.sada.survey.SurveyStatus.DRAFT)
                .orElseThrow(ApiException::notFound);
        if (!survey.acceptsResponsesAt(Instant.now())) {
            throw new ApiException(HttpStatus.GONE, "SURVEY_CLOSED", "This survey is no longer accepting responses");
        }
        if (responses.countBySurveyId(survey.getId()) >= MAX_RESPONSES_PER_SURVEY) {
            throw new ApiException(HttpStatus.GONE, "SURVEY_FULL", "This survey has reached its response limit");
        }
        Map<String, Object> answers = AnswerValidator.validate(survey.getQuestions(), rawAnswers);

        SurveyResponse response = new SurveyResponse();
        response.setSurvey(survey);
        response.setAnswers(answers);
        response.setSubmittedAt(Instant.now());
        responses.save(response);
        return new SubmitResult(response.getId(), survey.getThankYouMessage());
    }

    @Transactional(readOnly = true)
    public SurveyResultsDto results(UUID ownerId, UUID surveyId, ZoneId zone) {
        Survey survey = surveyService.owned(ownerId, surveyId);
        return ResultsCalculator.compute(survey, responses.findBySurveyIdOrderBySubmittedAtAsc(surveyId), zone);
    }

    @Transactional(readOnly = true)
    public PageDto<ResponseDto> page(UUID ownerId, UUID surveyId, int page, int size) {
        surveyService.owned(ownerId, surveyId);
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        Page<SurveyResponse> result = responses.findBySurveyIdOrderBySubmittedAtDesc(surveyId, PageRequest.of(safePage, safeSize));
        List<ResponseDto> items = result.getContent().stream()
                .map(r -> new ResponseDto(r.getId(), r.getSubmittedAt(), r.getAnswers()))
                .toList();
        return new PageDto<>(items, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional
    public void delete(UUID ownerId, UUID surveyId, UUID responseId) {
        surveyService.owned(ownerId, surveyId);
        SurveyResponse response = responses.findByIdAndSurveyId(responseId, surveyId).orElseThrow(ApiException::notFound);
        responses.delete(response);
    }

    @Transactional
    public int deleteAll(UUID ownerId, UUID surveyId) {
        surveyService.owned(ownerId, surveyId);
        return responses.deleteAllBySurvey(surveyId);
    }

    public record CsvFile(String filename, byte[] content) {
    }

    @Transactional(readOnly = true)
    public CsvFile exportCsv(UUID ownerId, UUID surveyId, ZoneId zone) {
        Survey survey = surveyService.owned(ownerId, surveyId);
        List<Question> questions = survey.getQuestions();
        boolean arabic = "ar".equals(survey.getLanguage());

        StringBuilder csv = new StringBuilder("﻿"); // BOM so Excel detects UTF-8 (Arabic)
        csv.append(cell("#")).append(',').append(cell(arabic ? "وقت الإرسال" : "Submitted at"));
        for (Question q : questions) {
            csv.append(',').append(cell(q.getTitle()));
        }
        csv.append("\r\n");

        int index = 1;
        for (SurveyResponse r : responses.findBySurveyIdOrderBySubmittedAtAsc(surveyId)) {
            csv.append(index++).append(',').append(cell(CSV_TIME.format(r.getSubmittedAt().atZone(zone))));
            for (Question q : questions) {
                Object value = r.getAnswers() == null ? null : r.getAnswers().get(q.getId().toString());
                csv.append(',').append(cell(format(value)));
            }
            csv.append("\r\n");
        }
        return new CsvFile("sada-" + survey.getSlug() + ".csv", csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String format(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Collection<?> items) {
            return items.stream().map(String::valueOf).collect(Collectors.joining("; "));
        }
        return String.valueOf(value);
    }

    private static String cell(String value) {
        String v = value == null ? "" : value;
        // Neutralise spreadsheet formula injection
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 && !v.matches("-?\\d+(\\.\\d+)?")) {
            v = "'" + v;
        }
        return '"' + v.replace("\"", "\"\"") + '"';
    }
}
