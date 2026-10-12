# Validação — Gree Desktop 0.3.0 — 12/10/2026

## Resultado

Código, TypeScript, build e instalador NSIS 0.3.0 gerados. **49 testes unitários passaram**, além do ensaio de interface Electron e da execução do pacote final.

Instalador: `release/Gree Desktop Setup 0.3.0.exe`, 107.933.124 bytes. SHA256: `0F62ED6AF47ECBEC52E0EECBD4348C82A02B1D20642F651D06E6D375992E42BC`.

## Proteção externa — dispositivos simulados

- Desligamento externo bloqueia religamento por automação; proteção persiste após recriar o controlador e continua respeitada em grupos, sem bloquear os membros restantes.
- Mudanças de temperatura definida, modo, ventilação e extras confirmados ativam proteção. Sensor ambiente e consultas idênticas não ativam.
- Comandos explícitos próprios não ativam proteção indevida e não removem uma proteção existente. Pausa temporária e proteção externa são independentes.
- Uma nova leitura antes do envio detecta mudança que ainda não chegou ao poll. Ação enfileirada revalida estado/proteção e condições de sensor antes de enviar.
- Reconexão compara referência persistente; primeira leitura sem referência estabelece baseline. Consultas repetidas não duplicam histórico.
- Retomar não executa a agenda do minuto atual nem uma condição de temperatura já ativa. Estado e duração reiniciam observação.

Os testes não enviaram comandos aos aparelhos físicos. A identificação é de alteração fora do desktop; não identifica controle físico/mobile. Não há garantia de percepção instantânea: existe uma janela entre leitura e envio UDP.

## Conforto e manutenção

Amostras por minuto, sensor inválido, segmentos separados após comunicação perdida, retenção de 30 dias, tempo ligado contínuo e ausência de dupla contagem em intervalos sobrepostos foram testados. Meia-noite usa o dia local; períodos de gráficos usam janelas decorridas de 1/24/168 horas. Próxima agenda considera aparelhos e grupos e não inventa horário para gatilhos de sensor.

Manutenção desativada, vencimento, adiamento de sete dias, conclusão e rejeição de data inválida foram testados. Favoritos e destinos/períodos dos IPCs são validados.

Coleta começa na versão nova. Tempo ligado é observado, não tempo total real ou atividade do compressor. Períodos desconhecidos e cobertura são exibidos; não há estimativa de kWh/custo. As curvas são consultadas por período e aparelho; o snapshot carrega somente resumos.

## Interface Electron

Ensaio determinístico sem UDP: slider, teclado, cancelamento, falha, leituras antigas/parciais, eventos externos, toasts, menus internos, transições interrompidas, movimento reduzido e alinhamento dos controles passaram. Ponteiro em offscreen combina mouse nativo com PointerEvent para movimento/soltura.

- Bandeja, conforto, resumo da casa e detalhes de proteção cabem sem rolagem em alturas de 780, 700, 590 e 496 px. Listas e alterações numerosas usam páginas internas.
- Escalas de 100%, 125%, 150% e 200% foram emuladas no Electron. Dois monitores foram testados geometricamente, inclusive origens negativas; não equivale a inspeção física de múltiplos monitores/DPI.
- Temas claro/escuro, nomes longos, avisos e rodapés foram renderizados e inspecionados. O gráfico mantém distinção ambiente/definida, lacunas e consulta acessível por teclado.
- Histórico com 47 registros simulados: paginação e filtro de falhas passaram.

Relatório: `.cache/ux-qa/report.json`. Prévias de conforto e proteção em `previews/` usam dados simulados.

## Aparelhos reais e pacote final

Os aparelhos 192.168.0.67 e 192.168.0.72, firmware V3.4.M, foram descobertos e lidos por AES-GCM no Electron e no pacote 0.3.0. DPAPI foi validado no perfil isolado. Nenhum comando físico de energia, temperatura, modo ou extra foi enviado nesta QA.

O executável final abriu SQLite, consultou séries de conforto e abriu o acompanhamento no aparelho solicitado pela bandeja. Inicialização automática foi conferida e restaurada na entrada isolada **Gree Desktop QA**, sem alterar a entrada normal do aplicativo.

Relatórios: `.cache/qa/report.json` e `.cache/packaged-030-final/report.json`.

## Perfil 0.2.0 → 0.3.0

O executável **0.2.0** foi extraído do instalador anterior sem executar instalação e criou um banco de QA com nomes, ambientes, funções, grupo, regra desabilitada, preferências e histórico. O pacote final **0.3.0** abriu esse mesmo perfil e preservou esses dados. Os dois registros de chaves protegidas permaneceram **idênticos** no ensaio com encerramento normal.

A comparação anterior com encerramento forçado produzia diferenças nos registros protegidos. O teste foi corrigido para encerrar o próprio processo de QA normalmente pelo depurador do processo principal, conectado apenas em localhost e habilitado somente na execução de QA. O aplicativo real não foi encerrado pelo teste. Nenhum endpoint adicional de depuração é aberto na execução normal.

Relatório conclusivo: `.cache/upgrade-020-030-graceful/report.json`; comparação de chaves por SHA256, sem expor seu conteúdo. As novas observações usam registros adicionais; não foram reescritas regras/configurações anteriores.

## Limites e histórico de validação

O cenário completo de desligamento por controle físico/mobile contra uma regra no aparelho real ainda precisa de uma sessão coordenada. A prevenção está validada por simulação; a comunicação real foi validada por leitura. Não houve reinício/logoff real do Windows ou ensaio prolongado das regras físicas.

O instalador 0.3.0 foi gerado, não instalado automaticamente. A compatibilidade do perfil foi testada entre executáveis; não é um ensaio NSIS sobre a instalação normal. Na etapa anterior, a revisão automática rejeitou esse ensaio com o aplicativo real ativo porque poderia interromper automações e alterar registro/atalhos compartilhados. Nenhum contorno dessa rejeição foi executado. A instalação/desinstalação NSIS da 0.1.0 havia sido validada anteriormente.

Na validação original da 0.1.0, a temperatura existente de 24 °C foi reaplicada nos dois aparelhos e confirmada, mantendo ambos desligados. AES-ECB não respondeu nesse firmware. Computador precisa ficar ligado e acordado; sair encerra automações. Pacote sem assinatura comercial.

## Correção do foco do slider

Contorno removido no clique e arraste; foco de teclado preservado na bola. A mensagem Ajustando usa altura e entrelinha fixas para evitar deslocamento de 2 px. Ensaio Electron passou com comparação das posições antes/durante o arraste, teclado, cancelamento, falha e escalas de 100%, 125%, 150% e 200%. Build e instalador regenerados. Nenhum comando físico foi enviado neste ensaio.

