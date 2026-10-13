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
