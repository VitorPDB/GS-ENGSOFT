# Interface do URIP

URIP combina superfícies claras, fundo creme e verde petróleo como cor principal de ação e navegação. A hierarquia usa títulos curtos, espaço entre grupos, ícones consistentes e ações com pesos distintos.

## Navegação

No computador, a barra lateral mostra Painel, Alertas, Avisos, Relatos e Histórico, com uma descrição da tarefa e acesso direto a Novo relato. No celular, os cinco destinos permanecem visíveis na barra inferior, dentro da área segura, com ícone, rótulo e seleção explícita.

As nove telas existentes continuam conectadas. Detalhe, origem/confiança, formulário e acompanhamento têm retorno contextual. A confirmação de um relato aparece somente no acompanhamento correspondente.

## Hierarquia e cor

| Papel | Cor |
|---|---|
| Superfície | #FFFFFF |
| Fundo | #F5F6F1 |
| Texto | #19332E |
| Texto secundário | #53665F |
| Ação principal | #0C665A |
| Ação suave | #E5F2EC |
| Destaque em gradiente | #123E3A → #0C665A |
| Alagamento | #155E9A sobre #EAF3FC |
| Calor | #8B4B08 sobre #FFF2D9 |
| Energia | #6942A1 sobre #F2ECFA |

Gradientes ficam nas introduções de destaque e nas superfícies de medição, com cor sólida de base. No celular, a introdução é compacta para dar espaço aos dados.

Tipo de risco e gravidade são informações diferentes: o tipo usa cor e ícone próprios; a gravidade usa selo com texto e ícone. Crítico é vermelho, alto é âmbar, moderado é azul e baixo é verde. Confiança continua identificada como índice demonstrativo.

## Organização das tarefas

- Painel: resumo compacto e grupos por tipo de risco.
- Alertas: filtros identificados, medida em destaque e acesso visível ao detalhe.
- Avisos: gravidade, estado de leitura local e ação principal separados.
- Relatos: cadastro destacado e registros com situação legível.
- Formulário: três grupos numerados para tipo, bairro e descrição.
- Acompanhamento: estado atual destacado e ações de avanço separadas do descarte.
- Histórico e origem: dados agrupados por rótulo e valor, com fórmulas e limites identificados.

## Acessibilidade e estados

Ações têm alvos de pelo menos 48 dp, rótulos e estados selecionado/desabilitado. Cores nunca são o único indicador. Pares principais de texto/fundo têm contraste acima de 4,5:1, incluindo os extremos dos gradientes. Layout verificado no navegador em 320 px e com texto ampliado; isso não substitui testes nativos de TalkBack ou escala de fonte do Android.

Simulação, leitura antiga, erro, falta de conexão e ausência de validação oficial continuam visíveis. As regras de risco, confiança e persistência permanecem no backend.
