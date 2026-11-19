package br.edu.urbanrisk.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(uniqueConstraints=@UniqueConstraint(name="uq_report_request",columnNames={"client_id","request_id"}),
    indexes={@Index(name="idx_report_client_time",columnList="client_id,created_at"),
        @Index(name="idx_report_retention",columnList="created_at")})
public class CommunityReport {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(name="client_id",nullable=false) public UUID clientId;
    @Column(name="request_id",nullable=false) public UUID requestId;
    @Enumerated(EnumType.STRING) @Column(nullable=false) public RiskType type;
    @Column(nullable=false,length=60) public String district;
    @Column(nullable=false,length=500) public String description;
    @Enumerated(EnumType.STRING) @Column(nullable=false) public ReportStatus status;
    @Column(name="created_at",nullable=false) public Instant createdAt;
    @Column(name="updated_at",nullable=false) public Instant updatedAt;
    protected CommunityReport() {}
    public CommunityReport(UUID clientId,UUID requestId,RiskType type,String district,String description,Instant now) {
        this.clientId=clientId;this.requestId=requestId;this.type=type;this.district=district;
        this.description=description;this.status=ReportStatus.REPORTADO;this.createdAt=now;this.updatedAt=now;
    }
}
