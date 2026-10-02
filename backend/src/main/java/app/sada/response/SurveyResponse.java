package app.sada.response;

import app.sada.survey.JsonConverters.AnswersConverter;
import app.sada.survey.Survey;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** One submitted form. {@code answers} maps question id (string) to its value. */
@Entity
@Table(name = "responses")
@Getter
@Setter
@NoArgsConstructor
public class SurveyResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "survey_id", nullable = false)
    private Survey survey;

    @Convert(converter = AnswersConverter.class)
    @Column(nullable = false, columnDefinition = "text")
    private Map<String, Object> answers;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;
}
