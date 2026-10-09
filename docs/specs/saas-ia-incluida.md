# IA incluída e operação SaaS — 06/10/2026

> Régua anterior documentada abaixo. A decisão de 07/10/2026 e migration 0251 passam a dez créditos por mensagem, teste de 1.000 créditos e pacote de R$49,99. Novas condições e compatibilidade: [Créditos e clínicas](creditos-e-clinicas.md).

## Contrato aprovado

Cliente novo escolhe negócio, informa como atende, conecta um WhatsApp verificado e confirma as capacidades antes de ativar. O teste começa nessa ativação: sete dias ou cem respostas completas, um usuário e um WhatsApp. Confirmação do e-mail e controle do número são condições obrigatórias. Preparar ou testar o rascunho não concede gratuidade.

Organizações existentes permanecem em `legacy` até migração administrativa individual. A migração conserva credenciais, agentes e versões publicadas. Agente já publicado exige período pago confirmado para a migração. Não há atualização da Luana nem ativação da cobrança real nesta entrega.

Uma resposta lógica aceita integralmente pelo canal consome um crédito, mesmo dividida em mensagens. A reserva é transacional; partes aceitas ficam registradas. Repetição conserva a identidade. Falha definitiva libera a reserva; entrega incerta depende de reconciliação. Recibos anteriores conservam `message_v1`; a regra nova é `response_v2`, sem cobrança retroativa.

Franquia mensal não acumula. A renovação usa o aniversário original em UTC, com último dia válido em meses menores. Extras acumulam, exigem assinatura ativa e são usados depois da franquia. Estorno de extras já consumidos gera dívida compensada em concessões posteriores, sem inventar saldo. Pagamento encerra o teste e inicia o período pago; cancelamento conserva o período pago. Reembolso e chargeback retiram o acesso do pagamento correspondente.

Franquias aprovadas: Básico 1.000, Pro 3.000 e Empresarial 6.000 respostas por mês; valores editáveis no admin. Preços das ofertas são os previamente cadastrados. Pacotes extras permanecem em rascunho até definição comercial e homologação, sem preço ou tarifa inventados.

## Implementação local

Migration 0248, apêndice idempotente e MANIFEST incluem contas comerciais, ledger, reservas, partes, concessões pagas, comparadores de teste, exceções e configuração de IA. O banco é a verdade do saldo. Custo operacional em USD e créditos comerciais são medidas distintas. Custo desconhecido é `null`, nunca zero.

Credenciais gerenciadas ficam no servidor. Modelo sem tarifa validada e fonte identificada impede ativação gerenciada. Há limites operacionais por empresa e contenção de custo da plataforma. Finalidades auxiliares, áudio e embeddings passam pela autorização comercial, sem debitar resposta ao cliente.

O catálogo versionado cobre contabilidade, clínica, roupas, eletrônicos, consultoria, manicure, barbearia, cabeleireiro, sobrancelhas, marcenaria, crédito/cobrança, imobiliária, agência/serviços, cursos e negócio genérico. Os prompts reutilizam método de atendimento, sem identidade nem condições da Advance. O contexto canônico da empresa complementa os prompts. Organizador e conversador têm ferramentas separadas. Agenda depende de serviço, duração, dias e horários reais escolhidos explicitamente. Follow-up proativo não nasce ligado.

O admin consulta todas as organizações, com origem, estado comercial, busca, total e paginação. A ficha reúne saldo, limites, canais, pagamentos e histórico. Ajustes, migração, suspensão, reativação, exceção de teste e reconciliação exigem motivo e auditoria. Suporte somente leitura não ganha capacidade de mutação.

O bloqueio comercial de gravação também passa pela guarda dos efeitos com service role. A migration 0249 estende o período contratado às gravações diretas no Storage com JWT, preservando a leitura e as policies de isolamento. Saldo de IA esgotado não impede atendimento humano dentro do período. Consulta, contratação, suporte e LGPD têm caminhos preservados. A verificação completa dos consumidores dessa guarda faz parte da homologação.

A migration 0250 confere os vínculos autenticados antes de consultar o período no helper de Storage. Assim, uma chamada RPC direta também não revela a disponibilidade comercial de outra empresa. As migrations 0249 e 0250 conservam a assinatura da função e os contratos dos tipos gerados.

## Segurança e limites da prova

RLS ligada não significa isolamento comprovado. A homologação inclui API, banco, Storage, Realtime e ferramentas. Memória possui vínculo composto entre organização e versão; mensagens não podem apontar para uma reserva de outra empresa. Saldo e histórico permitem apenas leitura própria autorizada; tabelas internas não ganham policies para silenciar avisos.

Um registro próprio pode carregar um caminho de arquivo adulterado. Antes de assinar, baixar ou excluir usando service role, os consumidores conferem o namespace canônico do objeto com a organização do contexto autenticado ou do job. Avatar, mídia, referências de skills, arquivos de conhecimento, exportação LGPD e fila de remoção não aceitam ponteiros de outra empresa. Caminhos relativos, escapes e separadores ambíguos são rejeitados. Falhas de extração/derivação seguem o registro e a recuperação existentes; remoção fora do escopo fica registrada como falha, sem apagar o arquivo.

As funções que precisam conferir `auth.users` são `SECURITY DEFINER`, com `search_path=''` e execução exclusiva de `service_role`. Não é concedida leitura geral de Auth a essa role. Funções de trigger não ficam executáveis como RPC. As três funções antigas com caminho mutável receberam caminho fixo e revisão de execução.

E-mail e número verificados comprovadamente usados em teste anterior impedem nova gratuidade, salvo exceção administrativa auditada. IP e dispositivo são sinais adicionais, não bloqueio automático de empresas em rede compartilhada. Comparadores usam HMAC por finalidade; sinais possuem retenção e minimização. Não se promete identificação infalível.

O proxy deve sobrescrever `x-real-ip` e `x-platform-proxy-token`, usando `TRUSTED_PROXY_SECRET`, e impedir acesso direto à origem. Sem prova do proxy, o IP é desconhecido. Cabeçalho arbitrário não vale como identidade. Turnstile é validado no servidor com ação, hostname e validade; o widget sozinho não autoriza teste.

## Homologação e publicação

Código presente não equivale a homologação concluída. Resultados executados, falhas e evidências ficam no relatório da entrega. São obrigatórios `gov:verify`, banco em instalação e atualização, build, E2E e evidências fictícias em desktop/celular. Integrações reais de WAHA, provedor de IA, e-mail, proxy, Turnstile e Hotmart precisam de credenciais/configurações do ambiente homologado. Não são substituídas por valores sintéticos.

A aplicação local e a Edge Hotmart publicada podem ter versões diferentes. O bundle da Edge deve ser regenerado com o processador canônico antes de publicação autorizada. Não publicar migração, Edge, VPS, imagem ou cobrança por consequência desta implementação local.
