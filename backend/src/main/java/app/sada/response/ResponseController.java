package app.sada.response;

import app.sada.common.ApiException;
import app.sada.common.ClientIp;
import app.sada.common.RateLimiter;
import app.sada.config.AppProperties;
import app.sada.response.ResultsDtos.PageDto;
import app.sada.response.ResultsDtos.ResponseDto;
import app.sada.response.ResultsDtos.SubmitRequest;
import app.sada.response.ResultsDtos.SubmitResult;
import app.sada.response.ResultsDtos.SurveyResultsDto;
import app.sada.security.CurrentUser;
import app.sada.survey.SurveyDtos.PublicSurveyDto;
import app.sada.survey.SurveyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

@RestController
public class ResponseController {

    private final ResponseService responseService;
    private final SurveyService surveyService;
    private final RateLimiter rateLimiter;
    private final int submissionsPerMinute;

    public ResponseController(ResponseService responseService, SurveyService surveyService, RateLimiter rateLimiter,
                              AppProperties props) {
        this.responseService = responseService;
        this.surveyService = surveyService;
        this.rateLimiter = rateLimiter;
        this.submissionsPerMinute = props.limits() == null ? 15 : props.limits().submissionsPerMinute();
    }

    // ------------------------------------------------------------ public (respondents)

    @GetMapping("/api/public/surveys/{slug}")
    public PublicSurveyDto publicSurvey(@PathVariable String slug) {
        return surveyService.getPublic(slug);
    }

    @PostMapping("/api/public/surveys/{slug}/responses")
    public ResponseEntity<SubmitResult> submit(@PathVariable String slug, @RequestBody SubmitRequest request,
                                               HttpServletRequest http) {
        if (!rateLimiter.tryAcquire("submit:" + ClientIp.of(http), submissionsPerMinute, Duration.ofMinutes(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Too many submissions, try again shortly");
        }
        SubmitResult result = responseService.submit(slug, request == null ? Map.of() : request.answers());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // ------------------------------------------------------------ owner

    @GetMapping("/api/surveys/{id}/results")
    public SurveyResultsDto results(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                    @RequestParam(required = false) String tz) {
        return responseService.results(CurrentUser.id(jwt), id, zone(tz));
    }

    @GetMapping("/api/surveys/{id}/responses")
    public PageDto<ResponseDto> responses(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return responseService.page(CurrentUser.id(jwt), id, page, size);
    }

    @DeleteMapping("/api/surveys/{id}/responses/{responseId}")
    public ResponseEntity<Void> deleteResponse(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                               @PathVariable UUID responseId) {
        responseService.delete(CurrentUser.id(jwt), id, responseId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/surveys/{id}/responses")
    public Map<String, Integer> deleteAllResponses(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return Map.of("deleted", responseService.deleteAll(CurrentUser.id(jwt), id));
    }

    @GetMapping("/api/surveys/{id}/export")
    public ResponseEntity<byte[]> export(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                         @RequestParam(required = false) String tz) {
        ResponseService.CsvFile file = responseService.exportCsv(CurrentUser.id(jwt), id, zone(tz));
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.filename()).build().toString())
                .body(file.content());
    }

    private static ZoneId zone(String tz) {
        if (tz == null || tz.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(tz);
        } catch (DateTimeException e) {
            return ZoneOffset.UTC;
        }
    }
}
