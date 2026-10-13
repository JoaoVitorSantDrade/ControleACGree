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
