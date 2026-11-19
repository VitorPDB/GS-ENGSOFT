package br.edu.urbanrisk.api;

import br.edu.urbanrisk.domain.*;
import br.edu.urbanrisk.service.CommunityReportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class CommunityReportController {
    private final CommunityReportService reports;
    public CommunityReportController(CommunityReportService reports) {this.reports=reports;}
    public record Input(@NotNull UUID requestId,@NotNull RiskType type,@NotBlank String district,
        @NotBlank @Size(min=10,max=500) String description) {}
    public record StatusInput(@NotNull ReportStatus status) {}
    @PostMapping
    public ResponseEntity<CommunityReportService.Report> create(@RequestHeader("X-Client-Id") UUID clientId,@Valid @RequestBody Input input) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
            .body(reports.create(clientId,input.requestId,input.type,input.district,input.description));
    }
    @GetMapping
    public ResponseEntity<List<CommunityReportService.Report>> list(@RequestHeader("X-Client-Id") UUID clientId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(reports.list(clientId));
    }
    @PutMapping("/{id}/status")
    public ResponseEntity<CommunityReportService.Report> update(@PathVariable long id,@RequestHeader("X-Client-Id") UUID clientId,
        @Valid @RequestBody StatusInput input) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(reports.update(id,clientId,input.status));
    }
}
