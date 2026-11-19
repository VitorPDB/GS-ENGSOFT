# URIP - Engenharia de Software


Versão 1.2 | 19/11/2026



## Urban Risk Intelligence Platform



Documentação técnica e protótipo funcional

Monitoramento demonstrativo de alagamentos, calor extremo e interrupções de energia, com análise explicável, origem dos dados e participação comunitária.

| Integrante | RM |
| --- | --- |
| Lucas Zolla Assis | 557952 |
| Lucas Baraldi Rodrigues | 555407 |
| Vitor Pantarotto de Brito | 554961 |

Acesso à solução

**Repositório:** [github.com/VitorPDB/GS-ENGSOFT](https://github.com/VitorPDB/GS-ENGSOFT)

**Protótipo funcional:** disponível no código do repositório; instruções de execução no README. Após iniciar backend e app, acessar http://localhost:8081. Esse endereço funciona somente na máquina de execução e não é um deploy público.

**Vídeo de demonstração:** [youtu.be/UmT9-mPAm40](https://youtu.be/UmT9-mPAm40)

**Antes de enviar:** publicar a versão correspondente no repositório acima e conferir o acesso ao código e ao vídeo em janela anônima. Se a avaliação exigir acesso imediato ao protótipo sem execução local, disponibilizar também um deploy ou uma alternativa navegável pública.

Escopo e leitura deste documento

O protótipo é acadêmico e usa fontes de medição simuladas. Não é serviço oficial de emergência, previsão validada ou despacho da Defesa Civil. As metas de qualidade e as verificações já executadas são identificadas separadamente.

Conteúdo: contexto e telas (p. 2); requisitos funcionais (p. 3); qualidade (p. 4); regras (p. 5); sequência (p. 6); estados (p. 7); arquitetura (p. 8); contratos e rastreabilidade (p. 9); demonstração e validação (p. 10).


## Problema, pessoas e escopo



Problema e objetivo

Informações sobre riscos urbanos podem chegar de fontes distintas, sem contexto comum de gravidade, atualização ou confiança. O URIP reúne ocorrências em um feed priorizado e permite consultar a origem, entender a análise e registrar relatos da comunidade.

Público-alvo: moradores e agentes locais que precisam acompanhar situações urbanas. O resultado esperado é facilitar a leitura e o acompanhamento; redução de danos e precisão no mundo real não foram demonstradas.

| Persona ilustrativa | Necessidade e tarefa |
| --- | --- |
| Ana, moradora | Entender quais riscos exigem atenção no bairro; consultar detalhe e orientação mesmo quando a API cai. |
| Paulo, agente local | Comparar gravidade, origem e idade das leituras; acompanhar o panorama sem tratar dado simulado como oficial. |
| Marina, operadora de serviço | Examinar interrupções e o histórico recebido; diferenciar uma medição de um relato comunitário não confirmado. |

Personas são hipóteses de projeto, sem entrevistas ou pesquisa de campo. Não há perfis de acesso separados para elas nesta versão.

| Tela | Nome | Tarefa principal |
| --- | --- | --- |
| T01 | Painel | Visão geral por risco e acesso ao feed. |
| T02 | Feed | Filtrar e ordenar ocorrências por prioridade. |
| T03 | Detalhe do alerta | Medida, gravidade, tendência e orientação. |
| T04 | Origem e confiança | Fonte, votos, fórmula e limites da confiança. |
| T05 | Notificações | Alertas atuais altos/críticos e leitura local. |
| T06 | Novo relato | Registrar risco, bairro fictício e descrição. |
| T07 | Meus relatos | Consultar registros desta instalação. |
| T08 | Acompanhamento | Ver relato e atualizar seu estado. |
| T09 | Atividade | Consultar até 30 leituras recentes. |


## Requisitos funcionais



Prioridades: **A** = alta, essencial ao fluxo e ao enunciado; **M** = média, complementa a experiência. Os identificadores conectam requisitos, telas e componentes.

| ID | P. | Descrição | Tela / contrato |
| --- | --- | --- | --- |
| RF01 | A | Receber e validar leituras simuladas de sensor, base pública ou comunidade; persistir apenas entradas válidas. | API / ingestão |
| RF02 | A | Calcular gravidade por intensidade e tendência; ordenar alertas por pontuação decrescente com desempate estável. | T01-T03 / dashboard |
| RF03 | A | Exibir panorama e filtrar o feed pelos três tipos de risco. | T01-T02 |
| RF04 | A | Exibir medida, unidade, bairro, horário, gravidade, tendência e orientação no detalhe. | T03 |
| RF05 | A | Identificar fonte simulada e explicar confiança base, fórmula e influência dos votos. | T04 |
| RF06 | M | Permitir like, dislike, troca e retirada; atualizar contadores e confiança no servidor. | T02 / reaction; T04 explica |
| RF07 | A | Apresentar aviso em primeiro plano para alerta alto/crítico novo ou com mudança de gravidade após sincronização anterior. | App / sincronização |
| RF08 | A | Listar na central os alertas atuais altos/críticos, sinalizar leitura local e permitir abrir o detalhe. | T05 |
| RF09 | A | Preservar último dashboard em cache e reconectar automaticamente; sinalizar indisponibilidade e leitura antiga. | T01-T05 / cache |
| RF10 | A | Registrar relato com tipo, bairro permitido e descrição; confirmar somente após resposta da API e reutilizar requestId nas tentativas. | T06 / reports POST |
| RF11 | A | Listar até 100 relatos da instalação e abrir seus dados e horários. | T07-T08 / reports GET |
| RF12 | A | Permitir ao autor da instalação iniciar acompanhamento, encerrar ou descartar segundo as transições válidas. | T08 / reports PUT |
| RF13 | M | Exibir até 30 leituras recentes com origem e horário, separadas dos relatos. | T09 / dashboard |
| RF14 | A | Bloquear mutações sem conexão/identidade disponível, mostrar erro e preservar rascunho para nova tentativa. | T02-T08 |

Relatos não substituem medições nem geram confirmação oficial. O UUID da instalação oferece segmentação pseudônima, não autenticação de uma pessoa.


## Requisitos não funcionais



Classificação segundo a **ISO/IEC 25010:2011**, edição adotada neste documento para o modelo de qualidade de produto. É uma edição anterior, substituída por revisões posteriores. A classificação não representa certificação.

| ID / categoria | Critério verificável | Evidência e limite |
| --- | --- | --- |
| RNF01; Eficiência de desempenho / comportamento temporal | Consultar dashboard a cada 5 s com app ativo; timeout HTTP de 5 s. Simulador gera em cerca de 12 s. Medir intervalo e latência; não garantir chegada em 5 s. | Configuração existente; intervalo de 11.871 ms observado anteriormente. |
| RNF02; Confiabilidade / disponibilidade e recuperabilidade | Ao perder API, manter último snapshot válido e sinalizar falha; reconectar sem reiniciar o app. Ensaio: parar/reiniciar API, recarregar e comparar dados. | Fluxo anterior verificado em E2E; não há SLA ou alta disponibilidade comprovada. |
| RNF03; Eficiência de desempenho / capacidade (escalabilidade) | Limitar histórico a 30 leituras e relatos a 100 por consulta; buscar última leitura por grupo sem limite global. Meta futura: p95 < 1 s com 100 clientes simultâneos. | Limites e busca projetados; teste de grupo existente. Carga de 100 clientes não executada. |
| RNF04; Usabilidade / operabilidade e acessibilidade | Tarefas principais navegáveis, controles ≥ 48 dp, rótulos, fonte do sistema e ausência de corte em 320 px. Verificar teclado web, TalkBack e fonte ampliada nativa. | Navegação web ampliada verificada em 320 px; Android em aparelho segue pendente. |
| RNF05; Segurança / confidencialidade e integridade | Não solicitar nome, GPS ou telefone; manter token de ingestão fora do app. Validar UUID e segmentar relatos. Orientar ausência de dados pessoais; retenção de 7 dias para relatos/leituras. | Pseudonimização não anonimização. Texto livre pode conter dados pessoais; sem auditoria de conformidade LGPD. |
| RNF06; Manutenibilidade / modularidade e testabilidade | Separar apresentação, negócio e dados. Testar limiares, votos, estados, validação e API; executar verificação das duas stacks. | 16 testes backend e 11 de cliente/infraestrutura passaram; estrutura em camadas preservada. |
| RNF07; Portabilidade / adaptabilidade | Executar versão web no Windows e usar componentes React Native para Android; manter endereço da API configurável por ambiente. | Web/exportação Hermes já verificadas; bundle não substitui teste em aparelho. |
| RNF08; Segurança / integridade | Não permitir relatos alterarem score nem estado final reabrir; envio idempotente por requestId da instalação. Testar repetição e transição inválida. | Testes backend e E2E verificam estados, isolamento e repetição sem duplicação. |

Fonte do modelo: ISO, ISO/IEC 25010:2011, https://www.iso.org/standard/35733.html (consulta: 18/11/2026). Requisitos e metas desta tabela foram definidos para o URIP.


## Regras de negócio



| Risco / indicador | Moderado / 35 | Alto / 65 | Crítico / 90 |
| --- | --- | --- | --- |
| Alagamento / chuva | ≥ 10 mm/h | ≥ 30 mm/h | ≥ 50 mm/h |
| Calor / temperatura | ≥ 30 °C | ≥ 35 °C | ≥ 40 °C |
| Energia / duração | ≥ 15 min | ≥ 60 min | ≥ 120 min |

**RB01 - Pontuação.** Abaixo da primeira faixa: 10. Tendência em elevação soma 5, com limite 100. Gravidade: baixo &lt; 30; moderado ≥ 30; alto ≥ 60; crítico ≥ 85. Ordenação: score decrescente e identificador estável.

**RB02 - Comparabilidade.** Comparar a leitura anterior do mesmo risco, bairro e fonte, com horário estritamente anterior e distância de até 30 min. Elevação exige diferença superior a 0,5 °C em calor ou 2 unidades nos demais. Sem histórico, não acrescentar tendência.

**RB03 - Origem e confiança.** Base sensor = 90%; base pública = 80%; comunidade = 55%. Todas essas fontes de medição são simuladas. Confiança = (base × 4 + likes) / (4 + likes + dislikes), usando base fracionária. Sensor: sem votos 90%; um like 92%; um dislike 72%.

**RB04 - Votos.** Um voto ativo por instalação, risco e bairro. Trocar substitui; repetir remove pela interface; PUT idêntico é idempotente. Contar janela móvel de 24 h. Votos não reduzem score ou gravidade. Leituras com mais de 90 s não recebem votos.

**RB05 - Atualidade.** Marcar leitura antiga imediatamente após 90 s. O alerta continua visível até retenção. No primeiro carregamento não emitir aviso de mudança; depois, avisar alto/crítico não antigo novo ou com gravidade diferente. Central lista alertas atuais altos/críticos; leitura é estado local, sem push.

**RB06 - Relatos.** Tipo FLOOD, HEAT ou OUTAGE; bairro entre Vila Esperança, Jardim das Flores e Centro; descrição de 10 a 500 caracteres. Não informar nomes, telefone, endereço exato ou outros dados pessoais. O sistema não promete detecção automática de dados pessoais.

**RB07 - Ciclo comunitário.** Envio válido cria REPORTADO. Autor inicia EM_MONITORAMENTO e pode ENCERRAR; REPORTADO ou EM_MONITORAMENTO podem ser DESCARTADOS. Estados finais não reabrem. Acompanhamento é declaração do autor, sem confirmação oficial ou conversão em medição.

**RB08 - Persistência e retenção.** Relatos: consulta por 7 dias e limpeza horária (armazenamento até 7 dias e 1 h); leituras: retenção de 7 dias; votos expiram em 24 h e são removidos na limpeza horária seguinte. Identidade e cache ficam localmente; UUID não comprova pessoa. Desinstalar/limpar dados pode perder o vínculo. Não usar o protótipo em decisões reais.


## Sequência de um alerta



Do recebimento de uma medição à notificação no app aberto. A classificação ocorre na consulta ao dashboard, e não como push no POST. Relatos livres seguem fluxo próprio.

Setas cheias: chamadas; tracejadas: retornos. Repositório representa leituras e votos; ReactionService agrega o feedback. Sem mudança relevante, o app apenas atualiza a tela.

Sequência: fonte → API → serviço → dados; alt inválido retorna 400/401, válido salva e retorna 201. Loop 5 s: app → API → serviço → dados e RiskAnalyzer → app; opt de alerta relevante apresenta aviso local.


## Estados do evento comunitário



O evento representado é o relato de risco criado pela comunidade. Os estados registram seu acompanhamento pelo autor, sem validar a existência física do risco ou certificar atendimento público.

Guardas e integridade

O servidor valida X-Client-Id e correspondência da instalação em toda atualização. Uma instalação diferente recebe recurso não encontrado; conhecer ou copiar o UUID permite impersonação, pois não há autenticação de conta. A interface só confirma a mudança após resposta da API.

Estado inicial existe apenas após POST válido. Erro de formulário mantém o rascunho e não cria evento. Repetir envio com o mesmo requestId deve devolver o mesmo relato; reutilizá-lo com conteúdo diferente deve ser rejeitado. Repetir o estado atual não cria nova transição. Estados finais rejeitam mudança.

A consulta oculta relatos após 7 dias; a limpeza horária remove os expirados (até 7 dias e 1 h de armazenamento); é política de armazenamento e não indica resolução do risco. Leituras de sensores mantêm seu próprio envelhecimento de 90 s, independente deste ciclo.

Diagrama: inicial → REPORTADO [enviar válido]; REPORTADO → EM_MONITORAMENTO [iniciar, autor]; EM_MONITORAMENTO → ENCERRADO [encerrar, autor]; REPORTADO ou EM_MONITORAMENTO → DESCARTADO [descartar, autor]; estados ENCERRADO e DESCARTADO → final.


## Arquitetura em camadas



O protótipo usa um backend único e um app React Native/Expo, também exportável para navegador. A separação de responsabilidades facilita os testes e mantém a análise no servidor.

Proteção e evolução

Token não embarcado no app; não solicitar nome, telefone ou GPS. Texto livre é de responsabilidade do autor e deve evitar dados pessoais. Cache local sem criptografia e votação/relatos pseudônimos têm limites de abuso. Para uso real: HTTPS, autenticação, controle de acesso, moderação, migrações, backups e monitoramento.

Escala e disponibilidade: API única não garante alta disponibilidade. O simulador deve ter um único produtor. Em crescimento: materializar estado por risco/bairro, otimizar consultas de tendência, paginar e executar testes de carga antes de definir um SLA.

Camadas: fontes/entradas → apresentação e API REST → aplicação/negócio → repositórios → banco. A notificação é local ao app; processamento de risco e retenção ficam no backend.


## Contratos e rastreabilidade



Contratos essenciais

| Rota | Contrato |
| --- | --- |
| GET /api/dashboard | Alertas ordenados, últimas 30 leituras, horário do servidor e total persistido; X-Client-Id opcional personaliza voto. |
| POST /api/readings | X-Ingest-Token; type, source, district, value e observedAt opcional. Validação e persistência de leitura simulada. |
| PUT /api/readings/{id}/reaction | clientId e vote LIKE/DISLIKE/NONE; resposta 204; conflito de leitura antiga em 409. |
| GET /api/reports | X-Client-Id obrigatório; array com até 100 relatos da instalação. |
| POST /api/reports | X-Client-Id; requestId UUID, type, district, description (10-500). Retorna o relato persistido. |
| PUT /api/reports/{id}/status | X-Client-Id; status permitido; retorna relato atualizado, sem alterar medição ou score. |

Relato retornado: id, requestId, type, district, description, status, createdAt e updatedAt. As operações preservam isolamento por instalação; não existe listagem pública de texto livre.

Fluxos de navegação

**Consultar risco:** T01 → T02 → T03 → T04 → voltar ao detalhe/feed.
**Acompanhar aviso:** T05 → T03; marcar lido é local.
**Participar:** T06 → confirmação no T08 → T07 → T08 → iniciar acompanhamento → encerrar/descartar.
**Consultar histórico:** T09; voltar às demais áreas pela navegação principal.

| Artefato / responsabilidade | Requisitos vinculados | Modelo / verificação |
| --- | --- | --- |
| Panorama, feed e detalhe | RF02-RF05 | Sequência / cálculo de risco |
| Votos e confiança | RF05-RF06 | Regras RB03-RB04 / testes de votos |
| Aviso, central e offline | RF07-RF09, RF14 | Sequência / cache e recuperação |
| Registro e acompanhamento | RF10-RF12, RF14 | Estados / API e fluxo comunitário |
| Recepção e histórico | RF01, RF13 | Sequência / persistência e validação |


## Validação e demonstração



Critérios de aceite e evidências

Verificação da ampliação: 16 testes backend e 11 de cliente/infraestrutura passaram, assim como TypeScript e exportação web. Quatro E2E com API real passaram: regressão do feed/offline, tela compacta, cadastro com resposta perdida e repetição sem duplicação, persistência após recarga e encerramento do relato.

O backend cobre criação, entrada inválida, isolamento de instalação, requestId repetido, transições e retenção. O navegador verificou envio → confirmação → acompanhamento → encerramento, erro/offline com rascunho preservado e votação existente. Configuração Android e bundle Hermes revalidados; não substituem teste em aparelho.

Android em aparelho, TalkBack/fonte ampliada, PostgreSQL e CI remoto exigem evidência própria. Não foram realizadas pesquisa de usabilidade, calibração dos limiares, testes de carga ou auditoria LGPD. Dependências conhecidas e limitações de segurança estão em SECURITY.md.

Roteiro de vídeo - até 3 minutos

| Tempo | Tela / ação | Conteúdo |
| --- | --- | --- |
| 0:00-0:20 | Mostrar painel | Problema, público e três riscos; avisar que são dados simulados. |
| 0:20-0:55 | Feed → detalhe → confiança | Mostrar prioridade, medida, origem e fórmula. Fazer like/dislike e explicar que gravidade não muda. |
| 0:55-1:20 | Central → detalhe | Mostrar alertas atuais e marcação local de lido, sem prometer push. |
| 1:20-2:10 | Novo relato → acompanhamento | Preencher sem dados pessoais; enviar, iniciar monitoramento e encerrar. Explicar que não é confirmação oficial. |
| 2:10-2:40 | Parar/reiniciar backend | Mostrar dados salvos, estado sem conexão e recuperação automática; cortar apenas esperas. |
| 2:40-2:55 | Atividade e encerramento | Mostrar histórico e citar arquitetura em camadas e documentação. |

Checklist de envio

Conferir nomes, RMs e links na primeira página; publicar o código correspondente; testar links públicos em janela anônima; conferir README; revisar coerência das telas, requisitos e diagramas. Um integrante envia o PDF pelo Teams, conforme calendário oficial.

Referências

Enunciado: Global Solution 2026.2 - Engenharia de Software, Urban Risk Intelligence Platform.
ISO/IEC 25010:2011: https://www.iso.org/standard/35733.html (edição histórica adotada; consulta em 18/11/2026).
Implementação URIP: RiskAnalyzer, ReactionService, MonitoringService, useMonitoring e sync; contratos de relatos descritos na p. 9.
