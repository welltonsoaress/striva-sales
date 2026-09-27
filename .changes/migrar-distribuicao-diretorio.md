---
impacto: nada_mudou
secao: corrigido
titulo: A migração inicial executa a atualização dentro da pasta instalada
---

A ponte de migração agora muda para o diretório da instalação antes de chamar o atualizador. Assim, o Compose encontra os arquivos do projeto mesmo quando o comando inicial é executado a partir de outra pasta.
