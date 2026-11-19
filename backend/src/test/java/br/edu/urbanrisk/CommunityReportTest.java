package br.edu.urbanrisk;

import br.edu.urbanrisk.domain.*;
import br.edu.urbanrisk.repository.CommunityReportRepository;
import br.edu.urbanrisk.service.CommunityReportService;
import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class CommunityReportTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired CommunityReportRepository reports;
    @Autowired CommunityReportService service;
    @Autowired Clock clock;
    private final String client=UUID.randomUUID().toString();
    @BeforeEach void clear() {reports.deleteAll();}
    private String body(String request) throws Exception {
        return json.writeValueAsString(Map.of("requestId",request,"type","FLOOD","district","Centro","description","Acúmulo de água observado na demonstração."));
    }
    private ResultActions create(String clientId,String body) throws Exception {
        return mvc.perform(post("/api/reports").header("X-Client-Id",clientId).contentType("application/json").content(body));
    }
    private ResultActions update(long id,String clientId,String status) throws Exception {
        return mvc.perform(put("/api/reports/"+id+"/status").header("X-Client-Id",clientId).contentType("application/json")
            .content(json.writeValueAsString(Map.of("status",status))));
    }
    @Test void retryIsIdempotentAndResultsAreScopedToInstallation() throws Exception {
        String request=UUID.randomUUID().toString(), input=body(request);
        String first=create(client,input).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("REPORTADO"))
            .andExpect(jsonPath("$.createdAt").isNotEmpty()).andExpect(jsonPath("$.clientId").doesNotExist())
            .andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsString();
        long id=json.readTree(first).get("id").asLong();
        create(client,input).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        assertEquals(1,reports.count());
        create(client,input.replace("Centro","Vila Esperança")).andExpect(status().isConflict());
        mvc.perform(get("/api/reports").header("X-Client-Id",client)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        String other=UUID.randomUUID().toString();
        mvc.perform(get("/api/reports").header("X-Client-Id",other)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        update(id,other,"EM_MONITORAMENTO").andExpect(status().isNotFound());
        create(other,input).andExpect(status().isCreated());
        assertEquals(2,reports.count());
    }
    @Test void validatesInputsAndDoesNotCreateMeasurements() throws Exception {
        String input=body(UUID.randomUUID().toString());
        mvc.perform(post("/api/reports").contentType("application/json").content(input)).andExpect(status().isBadRequest());
        create("invalid-uuid",input).andExpect(status().isBadRequest());
        create(client,input.replace("Centro","Bairro desconhecido")).andExpect(status().isBadRequest());
        create(client,input.replace("FLOOD","OTHER")).andExpect(status().isBadRequest());
        create(client,input.replace("Acúmulo de água observado na demonstração.","   ")).andExpect(status().isBadRequest());
        create(client,input.replace("Acúmulo de água observado na demonstração.","x".repeat(501))).andExpect(status().isBadRequest());
        create(client,input.replace("Acúmulo de água observado na demonstração.","         x")).andExpect(status().isBadRequest());
        assertEquals(0,reports.count());
        long before=json.readTree(mvc.perform(get("/api/dashboard")).andReturn().getResponse().getContentAsString()).get("storedReadings").asLong();
        create(client,input).andExpect(status().isCreated());
        mvc.perform(get("/api/dashboard")).andExpect(jsonPath("$.storedReadings").value(before));
    }
    @Test void followsExplicitLifecycleAndFinalStatesCannotReopen() throws Exception {
        long id=json.readTree(create(client,body(UUID.randomUUID().toString())).andReturn().getResponse().getContentAsString()).get("id").asLong();
        update(id,client,"ENCERRADO").andExpect(status().isConflict());
        update(id,client,"EM_MONITORAMENTO").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("EM_MONITORAMENTO"));
        update(id,client,"EM_MONITORAMENTO").andExpect(status().isOk());
        update(id,client,"REPORTADO").andExpect(status().isConflict());
        update(id,client,"ENCERRADO").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ENCERRADO"));
        update(id,client,"ENCERRADO").andExpect(status().isOk());
        update(id,client,"EM_MONITORAMENTO").andExpect(status().isConflict());
        update(id,client,"DESCARTADO").andExpect(status().isConflict());
        long discarded=json.readTree(create(client,body(UUID.randomUUID().toString())).andReturn().getResponse().getContentAsString()).get("id").asLong();
        update(discarded,client,"DESCARTADO").andExpect(status().isOk());
        update(discarded,client,"EM_MONITORAMENTO").andExpect(status().isConflict());
    }
    @Test void expiresOldReportsAndLimitsRecentList() throws Exception {
        UUID owner=UUID.fromString(client);Instant now=clock.instant();
        CommunityReport old=reports.saveAndFlush(new CommunityReport(owner,UUID.randomUUID(),RiskType.HEAT,"Centro","Exemplo de relato antigo.",now.minus(Duration.ofDays(8))));
        mvc.perform(get("/api/reports").header("X-Client-Id",client)).andExpect(jsonPath("$.length()").value(0));
        update(old.id,client,"EM_MONITORAMENTO").andExpect(status().isNotFound());
        service.cleanup();assertFalse(reports.existsById(old.id));
        List<CommunityReport> many=new ArrayList<>();
        for(int i=0;i<101;i++) many.add(new CommunityReport(owner,UUID.randomUUID(),RiskType.HEAT,"Centro","Relato de demonstração número "+i,now.minusSeconds(i)));
        reports.saveAllAndFlush(many);
        mvc.perform(get("/api/reports").header("X-Client-Id",client)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(100));
    }
}
