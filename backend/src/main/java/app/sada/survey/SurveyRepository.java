package app.sada.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SurveyRepository extends JpaRepository<Survey, UUID> {

    List<Survey> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

    Optional<Survey> findByIdAndOwnerId(UUID id, UUID ownerId);

    Optional<Survey> findBySlug(String slug);

    boolean existsBySlug(String slug);

    long countByOwnerId(UUID ownerId);

    /** Rows of [surveyId (UUID), count (Long)]. */
    @Query("select q.survey.id, count(q) from Question q where q.survey.owner.id = :ownerId group by q.survey.id")
    List<Object[]> countQuestionsByOwnerGrouped(@Param("ownerId") UUID ownerId);
}
