package app.sada.response;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, UUID> {

    Page<SurveyResponse> findBySurveyIdOrderBySubmittedAtDesc(UUID surveyId, Pageable pageable);

    List<SurveyResponse> findBySurveyIdOrderBySubmittedAtAsc(UUID surveyId);

    Optional<SurveyResponse> findByIdAndSurveyId(UUID id, UUID surveyId);

    long countBySurveyId(UUID surveyId);

    /** Rows of [surveyId (UUID), count (Long)] for every survey the owner has. */
    @Query("select r.survey.id, count(r) from SurveyResponse r where r.survey.owner.id = :ownerId group by r.survey.id")
    List<Object[]> countByOwnerGrouped(@Param("ownerId") UUID ownerId);

    @Modifying
    @Query("delete from SurveyResponse r where r.survey.id = :surveyId")
    int deleteAllBySurvey(@Param("surveyId") UUID surveyId);
}
