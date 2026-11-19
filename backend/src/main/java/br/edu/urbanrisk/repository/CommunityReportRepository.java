package br.edu.urbanrisk.repository;

import br.edu.urbanrisk.domain.CommunityReport;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface CommunityReportRepository extends JpaRepository<CommunityReport,Long> {
    Optional<CommunityReport> findByClientIdAndRequestId(UUID clientId,UUID requestId);
    List<CommunityReport> findTop100ByClientIdAndCreatedAtAfterOrderByCreatedAtDescIdDesc(UUID clientId,Instant after);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CommunityReport> findByIdAndClientId(Long id,UUID clientId);
    long deleteByCreatedAtBefore(Instant before);
}
