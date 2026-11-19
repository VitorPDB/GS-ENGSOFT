package br.edu.urbanrisk.service;

import br.edu.urbanrisk.domain.*;
import br.edu.urbanrisk.repository.CommunityReportRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CommunityReportService {
    private static final Set<String> DISTRICTS=Set.of("Vila Esperança","Centro","Jardim das Flores");
    private final CommunityReportRepository reports;
    private final Clock clock;
    public CommunityReportService(CommunityReportRepository reports,Clock clock) {this.reports=reports;this.clock=clock;}

    public record Report(long id,UUID requestId,RiskType type,String district,String description,
        ReportStatus status,Instant createdAt,Instant updatedAt) {}
    private static Report view(CommunityReport r) {
        return new Report(r.id,r.requestId,r.type,r.district,r.description,r.status,r.createdAt,r.updatedAt);
    }

    @Transactional
    public Report create(UUID clientId,UUID requestId,RiskType type,String district,String description) {
        String text=description.strip();
        if(!DISTRICTS.contains(district) || text.length()<10 || text.length()>500)
            throw new IllegalArgumentException("Selecione um bairro da demonstração e descreva a ocorrência em 10 a 500 caracteres.");
        Optional<CommunityReport> prior=reports.findByClientIdAndRequestId(clientId,requestId);
        if(prior.isPresent()) {
            CommunityReport r=prior.get();
            if(r.type!=type || !r.district.equals(district) || !r.description.equals(text))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Identificador de envio já utilizado para outro relato.");
            return view(r);
        }
        return view(reports.saveAndFlush(new CommunityReport(clientId,requestId,type,district,text,clock.instant())));
    }

    @Transactional(readOnly=true)
    public List<Report> list(UUID clientId) {
        return reports.findTop100ByClientIdAndCreatedAtAfterOrderByCreatedAtDescIdDesc(clientId,clock.instant().minus(Duration.ofDays(7)))
            .stream().map(CommunityReportService::view).toList();
    }

    @Transactional
    public Report update(long id,UUID clientId,ReportStatus next) {
        CommunityReport r=reports.findByIdAndClientId(id,clientId)
            .filter(item->!item.createdAt.isBefore(clock.instant().minus(Duration.ofDays(7))))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Relato não encontrado para esta instalação."));
        if(r.status==next) return view(r);
        boolean allowed=(r.status==ReportStatus.REPORTADO && (next==ReportStatus.EM_MONITORAMENTO || next==ReportStatus.DESCARTADO))
            || (r.status==ReportStatus.EM_MONITORAMENTO && (next==ReportStatus.ENCERRADO || next==ReportStatus.DESCARTADO));
        if(!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT,"Transição de acompanhamento não permitida.");
        r.status=next;r.updatedAt=clock.instant();
        return view(reports.save(r));
    }

    @Scheduled(initialDelay=60000,fixedDelay=3600000)
    @Transactional
    public void cleanup() {reports.deleteByCreatedAtBefore(clock.instant().minus(Duration.ofDays(7)));}
}
