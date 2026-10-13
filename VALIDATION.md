# Validação local — Gree Desktop 0.4.1 — 13/10/2026

- 51 testes unitários passaram; TypeScript, build e instalador Windows x64 NSIS concluídos.
- Executável empacotado iniciado com perfil de QA isolado: SQLite, conforto, interface e descoberta/leitura dos dois aparelhos GCM passaram. Nenhum comando físico enviado; registro de autostart não alterado.
- Fluxo de instalação/atualização não executado sobre o aplicativo em uso.
- Mac Intel removido da matriz e dos alvos macOS. Release 0.4.0 recebe aviso de última versão suportada; downloads históricos preservados.
- Esta entrega gera o instalador 0.4.1 local; não afirma builds Linux/macOS 0.4.1 nem release pública 0.4.1.

Instalador: `release/Gree-Desktop-0.4.1-win-x64.exe`. SHA256: `9f9d72557d79f5d828805561641f1c7fc6efe0821dfe86d6149c35d5d10a5da2`.

## Evidências anteriores

# Validação — Gree Desktop 0.4.0 — 13/10/2026

- 51 testes unitários passaram localmente e nos quatro runners nativos.
- Build/empacotamento passaram em Windows x64, Ubuntu 22.04 x64, macOS 15 Intel e macOS 15 Apple Silicon.
- Smoke nativo de Electron, montagem da interface e SQLite passou nas quatro arquiteturas; dados IPC simulados e nenhum comando físico.
- Ensaio completo de UX passou no Windows local. Autostart Linux tem teste de geração da entrada; ativação real de autostart/itens de login, bandeja e instalação em Linux/macOS não foram validadas em máquinas de uso.
- Sem nova migração de banco ou alteração das regras; migração de chaves entre sistemas não é suportada.
- Pacotes macOS sem Developer ID/notarização. Windows continua sem assinatura comercial.

Evidência: [GitHub Actions](https://github.com/JoaoVitorSantDrade/ControleACGree/actions/runs/38393397543). Downloads e hashes na release v0.4.0.

## Evidências históricas

# Validação — Gree Desktop 0.3.1 — 13/10/2026

- 50 testes unitários passaram; TypeScript e build concluídos.
- Ensaio Electron simulado: slider, envio único, rollback, teclado, menus, hover sem reflow, toasts, proteção, histórico e gráfico passaram. Escalas emuladas 100%, 125%, 150% e 200%; vistas compactas sem rolagem; movimento reduzido.
- Pacote 0.3.1 executado com perfil isolado: SQLite, interface, conforto e leituras físicas dos dois aparelhos GCM funcionaram. Nenhum comando físico foi enviado nesta entrega.
- Compatibilidade 0.3.0 → 0.3.1 validada entre executáveis: aparelhos, grupos, regras, preferências e histórico preservados. Dois registros de chaves protegidas permaneceram idênticos após encerramento normal.
- Instalador NSIS gerado. Instalação/atualização sobre aplicativo em uso não executada; não se afirma validação desse fluxo nem inspeção física em dois monitores.

Instalador: `release/Gree Desktop Setup 0.3.1.exe`, 108300987 bytes.
SHA256: `a9cc8ffc860e4327f0f6f5031f51011888a05e0e57fdc4b731ce864894109e49`.

## Evidências históricas da 0.3.0 e refinamentos

# Validação — Gree Desktop 0.3.0 — 12/10/2026

## Resultado

Código, TypeScript, build e instalador NSIS 0.3.0 gerados. **50 testes unitários passaram**, além do ensaio de interface Electron e da execução do pacote final.

Instalador: `release/Gree Desktop Setup 0.3.0.exe`, 108.289.784 bytes. SHA256: `6D75C55EBEBEB31E6C10515BE929FB08CABA4C37D432735C3928AFEA7E218238`.

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


## Bandeja minimalista e ícone de temperatura

Janela padrão reduzida de 780 para 680 px, trilho de 14 px e ambiente sem cartão volumoso. Rodapé e status separados; falhas mantêm acesso pelo status, toasts flutuam no cabeçalho sem deslocar controles. Temperatura no ícone vem somente de sensor atual do primeiro favorito/primeiro aparelho; leituras vencidas restauram o ícone normal. Bitmap testado para limites e mudança de valor. Pacote abriu SQLite e consultou os dois aparelhos físicos (GCM), sem comandos; relatório .cache/packaged-minimal/report.json. Umidade não tem suporte validado e não foi adicionada.


## Controle rápido e gráfico refinados

Removidos rótulo redundante, rodapé com atalhos Desktop e vista Conforto agora. Origem/horário permanecem em detalhes de ambiente. Modo/Ventilação em duas colunas amplas, Turbo em linha própria, limites do slider integrados e seleção de textos desativada, preservando edição de campos. Gráfico inicia na primeira amostra disponível e não interpola lacunas. Removidos os dois parágrafos explicativos de observação. Ensaio Electron atualizado passou (ponteiro, teclado, falhas, leituras vencidas, grupos, menus, escalas 100/125/150/200%, vistas pequenas e proteção); gráfico conferido com primeira amostra uma hora antes, apesar do período de 24 h. Os 50 testes passaram. Capturas em previews/bandeja-minimalista.png e previews/conforto.png. Neste refinamento não foram enviados comandos físicos nem executado o instalador.



## Referência visual Névoa

Composição refeita com seleção direta de modos, Vento/Direção vertical e extras condicionados aos recursos confirmados. 50 testes passaram; renderização inspecionada em previews/bandeja-nevoa.png (dados simulados), com todos os controles sem rolagem. Ensaio Electron verifica confirmações, restauração de falha, teclado, menus, escalas e proteção. Sem envio de comandos aos aparelhos físicos neste refinamento. Instalador regenerado, sem instalação automática.


## Slider com escala Névoa

Trilho de 6 px, alça grafite com núcleo azul e 15 marcações com rótulos em 16/23/30 graus. Centro e preenchimento mantêm a geometria acessível anterior; foco de teclado preservado e sem contorno no arraste. Inspeção visual em previews/slider-nevoa.png. 50 testes e ensaio Electron de extremos, arraste, teclado, cancelamento, falha, consultas concorrentes e escalas passaram. Instalador regenerado sem instalação automática ou comandos físicos.



## Alinhamento dos extremos da escala

Trilho visível limitado ao percurso útil da alça: começa no centro da posição 16 e termina no centro da posição 30. Preenchimento usa o mesmo ponto inicial. Ensaio Electron compara centros das marcações com as pontas do trilho (tolerância menor que 0,5 px), além de arraste, teclado e restauração. Captura atualizada em previews/slider-nevoa.png. Nenhum comando físico enviado.



## Profundidade e movimento da ilustração

Build e ensaio Electron concluídos. Inspeção visual dos estados ligado/desligado e comparação da geometria da bandeja. Testes verificam animação da aleta com oscilação, fluxo em refrigeração e ausência de ambas as animações em movimento reduzido, além dos controles e escalas existentes. Captura simulada em previews/ar-condicionado-nevoa.png. Instalação automática e comandos físicos não foram executados neste refinamento.


## 13/10/2026 — contorno sobre fundo claro e pausa compacta

Build concluído. Inspeção renderizada sobre fundo branco, sem sombra externa cortada: .cache/ux-qa/white-background.png. Sombra nativa desativada na janela de bandeja; confirmação final no compositor Windows do usuário permanece pela instalação. Pausa agora em indicador SVG junto ao nome, com vistas próprias para proteção externa/pausa temporária e retomada explícita. Ensaios de bandeja verificam rodapé com pelo menos 16 px livres abaixo, detalhes de proteção, menus, escalas e ausência de rolagem. Nenhum comando físico ou instalação automática neste refinamento.


## 13/10/2026 — microanimações consistentes

TypeScript e build concluídos. Ensaio Electron força hover em Power, modo, seletor de ventilação, extra e atalho: transformações presentes e posições/tamanhos de layout inalterados. Suíte de interface também verifica slider, falhas, menus, toasts, proteção e escalas. Sem comandos físicos ou instalação automática.

