# Preparação da release — 09/10/2026

O proprietário autorizou preparar o banco vinculado e publicar a release no GitHub com CI e imagens. Isso não habilita cobrança pública nem executa atualização da aplicação na VPS. O número vem do corte automático dos fragmentos; a conferência calculou uma major sobre 1.2.0.

## Banco preparado

Projeto Supabase `fpvvjjkazwrbrxujcftp`: estrutura e dados de `public`, `auth` e `storage` exportados antes da alteração, fora do Git, com acesso local restrito e hashes SHA256. O cliente de dump usa Postgres 17, compatível com o servidor. A exportação de dados tem relações circulares: restauração exige o procedimento próprio com suspensão dos triggers durante a importação. Não foi executada restauração sobre o projeto de produção. Arquivos exportados não incluem os objetos binários do Storage; não representam um backup integral da VPS.

Migrations 0248–0253 aplicadas em ordem, usando os arquivos versionados. O Supabase registrou os timestamps de execução; os nomes preservam a correspondência com os arquivos. Baseline, MANIFEST e tipos gerados acompanham os mesmos contratos.

Comparação anterior/posterior: uma organização, uma credencial, nenhum contrato e nenhum pagamento. A versão publicada, o hash do prompt e o vínculo de credencial do agente existente permaneceram iguais. A organização existente conserva `legacy`; IA gerenciada permanece desabilitada até configuração explícita. Nenhuma versão de agente foi publicada ou substituída.

Nenhuma tabela comum de `public` ficou sem RLS. As três funções apontadas com `search_path` mutável passaram a ter caminho fixo. Usuários autenticados não possuem atualização direta de credenciais ou bindings de IA. Os testes locais de isolamento e invariantes acompanham o CI da release; esses fatos não equivalem a declarar todo o sistema livre de vulnerabilidades.

Permanecem avisos do Supabase sobre extensões em `public`, funções privilegiadas intencionalmente expostas com autorização própria e proteção de senhas vazadas desligada. Tabelas internas com RLS e nenhuma policy continuam restritas, sem criar policies públicas apenas para silenciar o verificador. A classificação está na [revisão SaaS](2026-10-07-saas-seguranca-e-homologacao.md).

As seis ofertas têm valores e limites corretos no catálogo, com `checkout_available=false`. A venda de extras continua indisponível.

## Correções encontradas na publicação

O primeiro CI identificou uma configuração que tentava carregar a Edge antes de preparar seu pacote, um uso de relógio impuro na renderização do faturamento e uma asserção antiga esperando menu completo como default. A configuração local mantém a Edge desativada; seu pacote financeiro é preparado à parte. O faturamento usa o horário da própria fotografia de saldo. A asserção agora exige o default simples aprovado; fixtures de organizações legadas declaram explicitamente interface completa, preservando a cobertura das áreas avançadas.

A revisão das dependências atualizou Next.js para 16.3.8, SDK de MCP para 1.31.0 e os pisos transitivos afetados, sem mudar suas versões principais. A auditoria de dependências de produção retornou zero avisos nesta preparação. A auditoria completa ainda aponta `braces` 3.0.3, sem correção publicada, alcançado por ferramentas de lint/testes; seus padrões são internos ao repositório, não entradas de clientes. Esse resultado não cobre o sistema operacional ou dependências dos serviços externos.

Fontes das correções: [Next.js 16.3.8](https://github.com/vercel/next.js/releases/tag/v16.3.8), [SDK MCP e OAuth](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6qxp-vccf-f47h), [aviso de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Publicação e liberação comercial

O [PR #18](https://github.com/welltonsoaress/striva-sales/pull/18) reúne os dois planos e as correções. A integração e o corte dependem dos checks do commit final; build, banco, interface e imagens não serão ignorados para publicar. A `main` foi medida sem proteção de branch nesta data: o processo acompanha os checks explicitamente, sem usar essa ausência para contorná-los.

O receptor financeiro precisa usar os processadores da mesma release após a preparação do banco. A implantação desse pacote conserva o endpoint e a autenticação privada existentes; não requer expor ou alterar o segredo no código.

A homologação real da compra segue [este procedimento](../runbooks/homologar-compra.md). Ainda requer eventos emitidos pela Hotmart para correlação, aprovação, retorno, recorrência e reversão. O simulador do Resend não comprova e-mails reais; falta domínio controlado para o remetente e SMTP de autenticação. Essas pendências impedem anunciar cadastro público e cobrança como homologados, mesmo após a release dos artefatos.
