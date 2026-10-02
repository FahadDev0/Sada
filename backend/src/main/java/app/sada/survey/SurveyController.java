package app.sada.survey;

import app.sada.security.CurrentUser;
import app.sada.survey.SurveyDtos.StatusRequest;
import app.sada.survey.SurveyDtos.SurveyDto;
import app.sada.survey.SurveyDtos.SurveySummaryDto;
import app.sada.survey.SurveyDtos.SurveyUpsertRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/surveys")
public class SurveyController {

    private final SurveyService service;

    public SurveyController(SurveyService service) {
        this.service = service;
    }

    @GetMapping
    public List<SurveySummaryDto> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(CurrentUser.id(jwt));
    }

    @PostMapping
    public ResponseEntity<SurveyDto> create(@AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody SurveyUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(CurrentUser.id(jwt), request));
    }

    @GetMapping("/{id}")
    public SurveyDto get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.get(CurrentUser.id(jwt), id);
    }

    @PutMapping("/{id}")
    public SurveyDto update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                            @Valid @RequestBody SurveyUpsertRequest request) {
        return service.update(CurrentUser.id(jwt), id, request);
    }

    @PostMapping("/{id}/status")
    public SurveyDto setStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                               @Valid @RequestBody StatusRequest request) {
        return service.setStatus(CurrentUser.id(jwt), id, request.status());
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<SurveyDto> duplicate(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.duplicate(CurrentUser.id(jwt), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        service.delete(CurrentUser.id(jwt), id);
        return ResponseEntity.noContent().build();
    }
}
