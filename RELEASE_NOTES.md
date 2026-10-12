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

## Ajustes posteriores de UI

- Recursos opcionais em ordem fixa, grade de duas colunas e controles de 40 px; botões de energia com largura comum.
- Ícone do cartão ligado com rotação lenta e pulso discreto, respeitando movimento reduzido e visibilidade.
- Histórico com busca, filtros por aparelho/resultado/origem/período, limpeza e paginação de 10/20/50 registros. O conjunto disponível continua sendo os 300 registros mais recentes do snapshot.
- QA Electron validou ordem/tamanho dos recursos, animação ligada, paginação e filtro de falhas com 47 registros simulados.
