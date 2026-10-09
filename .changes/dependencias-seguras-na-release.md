---
impacto: nada_mudou
secao: corrigido
titulo: Dependências atualizadas para corrigir os avisos de segurança da publicação
---

O Next.js recebe as correções de segurança 16.3.8 e o SDK de MCP recebe a correção de OAuth. Os pisos das dependências transitivas de URI, endereços IP, expansão de padrões, HTTP e mapas de código também foram atualizados, preservando as versões principais de cada árvore. A atualização acompanha o lockfile e as imagens construídas pelo CI; não exige configuração nova na instalação.

O contexto Docker também exclui a pasta de backups e evidências privadas da sessão, além das credenciais de testes e do estado local do Supabase. Essa exclusão protege construções locais; as imagens publicadas pelo CI são construídas a partir do checkout versionado.
