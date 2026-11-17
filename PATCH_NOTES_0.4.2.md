# Gree Desktop 0.4.2 — recuperação de inicialização

- Inicialização informa falhas de armazenamento em uma janela de erro, em vez de fechar silenciosamente.
- Gravações SQLite sincronizadas em disco antes da substituição do arquivo.
- Backup local `gree.sqlite.bak` atualizado após persistência; recuperação automática quando o banco principal está danificado e o backup é válido.
- Verificação de integridade ao abrir; arquivo danificado preservado durante recuperação. Sem backup válido, o aplicativo informa o problema e mantém os arquivos intactos.
- Repetição da substituição de arquivo também no backup para lidar com bloqueios transitórios no Windows.

Não reconstrói dados apagados ou zerados, nem identifica a causa física da corrupção. Backup local não substitui cópia externa.
