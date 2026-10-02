package app.sada.ai;

import app.sada.ai.AiService.GenerateRequest;
import app.sada.ai.AiService.InsightsDto;
import app.sada.ai.AiService.UsageDto;
import app.sada.security.CurrentUser;
import app.sada.survey.SurveyDtos.SurveyDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/api/ai/usage")
    public UsageDto usage(@AuthenticationPrincipal Jwt jwt) {
        return aiService.usage(CurrentUser.id(jwt));
    }

    @PostMapping("/api/ai/generate-survey")
    public ResponseEntity<SurveyDto> generate(@AuthenticationPrincipal Jwt jwt, @RequestBody GenerateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(aiService.generateSurvey(CurrentUser.id(jwt), request));
    }

    @PostMapping("/api/surveys/{id}/insights")
    public InsightsDto insights(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return aiService.insights(CurrentUser.id(jwt), id);
    }
}
