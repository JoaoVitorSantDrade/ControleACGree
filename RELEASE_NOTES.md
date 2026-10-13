# Gree Desktop 0.4.1

- Aletas verticais ilustradas por SVG, com posições descritivas e faixas estáticas de oscilação. Crédito: [@dinoriquinho](https://twitter.com/dinoriquinho).
- Turbo usa ícone de foguete; modo Calor confirmado usa paleta âmbar/laranja Névoa.
- Suporte a Mac Intel encerrado: **0.4.0 é a última versão suportada**. Seus downloads permanecem disponíveis; próximas compilações macOS são somente Apple Silicon (arm64).
- Windows x64 e Linux x64 continuam suportados. Sem migração do banco ou alteração das regras.

---

# Gree Desktop 0.4.0 — Windows, Linux e macOS

- Pacotes Windows x64 (EXE), Linux x64 (AppImage e DEB) e macOS Intel/Apple Silicon (DMG e ZIP).
- Inicialização com o sistema adaptada: autostart no Linux e itens de login no macOS/Windows.
- Chaves protegidas pelo armazenamento seguro do sistema; no Linux, exige Secret Service/KWallet e recusa backend basic_text.
- Reabertura do painel pelo Dock no macOS e texto de configurações independente do sistema.
- Compilação em runners nativos, testes unitários e smoke de Electron/interface/SQLite para cada arquitetura.
- Licença MIT incluída nos novos pacotes; SHA256 dos downloads na release.

## Instalação e limites

Linux: DEB para Debian/Ubuntu ou AppImage executável (`chmod +x`). AppImage pode exigir libfuse2; bandeja depende do ambiente gráfico (GNOME pode precisar de extensão AppIndicator). Habilite um chaveiro Secret Service/KWallet para vincular aparelhos.

macOS: arraste o app do DMG para Aplicativos. Os pacotes não possuem assinatura Developer ID nem notarização; o Gatekeeper pode exigir aprovação em Privacidade e Segurança. Autorize acesso à rede local quando solicitado.

Todos: computador acordado, UDP 7000 acessível e mesma rede dos aparelhos. Dados/chaves ficam no perfil local de cada sistema; não se promete transferência de chaves protegidas entre sistemas.

Testes de CI verificam runtime e UI com dados simulados; não substituem validação de aparelhos físicos, bandeja/autostart ou instalação em Linux/macOS reais. Não há nova lógica de automação nem migração de banco.

---

# Gree Desktop 0.3.1 — 13/10/2026

## Novidades

- Ícone da bandeja mostra a temperatura ambiente atual do aparelho favorito. Sem leitura válida, retorna ao ícone Gree.
- Ar-condicionado com profundidade, aletas e fluxo de ar animados conforme o estado confirmado; suporte a movimento reduzido.
- Versão instalada visível nas Preferências.

## Melhorias e correções

- Controle rápido mais minimalista: modos em faixa, seletores de vento/direção e extras consistentes, sem rolagem.
- Slider fino com marcações alinhadas aos extremos, prévia contínua e um único comando ao soltar. Foco de teclado preservado, sem contorno ao arrastar.
- Hover e pressionamento no Power, modos, seletores, extras e atalhos, sem deslocar o layout.
- Contorno limpo sobre fundos claros; indicador compacto de pausa/proteção e rodapé com mais espaço.
- Temperatura ambiente compacta; automações, inicialização com Windows e acompanhamento ficam no Desktop.
- Gráfico de conforto começa na primeira leitura disponível do período. Textos redundantes removidos.
- Textos da interface não selecionáveis; campos de edição continuam selecionáveis.

## Compatibilidade

Sem migração do banco ou alteração das regras de automação. A proteção contra alterações externas continua exigindo retomada explícita.

## Revisão de recursos futuros

Umidade depende de suporte comprovado do sensor/protocolo. Cenas de um toque, temporizador rápido e integração Home Assistant permanecem no backlog; não entram nesta atualização de acabamento.

Consulte VALIDATION.md para testes e limites da entrega.

---

# Gree Desktop 0.3.0

- Proteção persistente contra sobrescrita por automações após alteração fora do desktop, por aparelho e respeitada nos grupos.
- Leitura anterior ao comando automático; fila e condições revalidadas; retomada explícita sem ações retroativas.
- Curvas ambiente/definida, cobertura, lacunas, eventos e tempo ligado observado.
- Lembrete de manutenção por calendário, conclusão e adiamento.
- Favoritos, resumo paginado da casa, próxima agenda e vistas de conforto/proteção na bandeja.
- Histórico com origem/motivo e valores detectados; novos IPCs restritos e consultas limitadas.
- 49 testes unitários, ensaio Electron de UI e leituras físicas. Detalhes em VALIDATION.md.

Dados e regras da 0.2.0 são preservados. Coleta começa na 0.3.0, sem reconstrução retroativa, estimativa energética ou identificação do controle externo específico.

---

# Gree Desktop 0.2.0

- Design Névoa: grafite, ciano, iluminação por estado e foco conforme a forma dos controles.
- Temperatura ambiente separada do ajuste, detalhes do sensor e faixas de grupos.
- Slider orgânico, prévia contínua e envio único ao confirmar o gesto.
- Feedback após confirmação, origem de mudanças e restauração em falha.
- Abertura/saída animadas da bandeja, menus e vistas internas sem rolagem.
- Toasts temporários, botões centralizados e cartões alinhados.
- Movimento reduzido, escalas emuladas e testes de interrupções.

Sem migração do banco ou mudanças na lógica das regras. Código e instalador disponíveis; compatibilidade de dados validada entre executáveis 0.1.0 e 0.2.0. Atualização pelo instalador e preservação byte a byte das chaves protegidas não comprovadas. Consulte VALIDATION.md.
