"use client";
import Link from "next/link";
import { ArrowRight, CaretDown, Check, ShieldCheck } from "@/lib/ui/icons";
import type { CommercialPlan } from "@/lib/billing/plans";
import { Journey, Logo } from "./LandingPage";
import { PricingSection } from "./PricingSection";
import styles from "./landing.module.css";
import clinic from "./clinics.module.css";

const trial = "/signup?segment=clinica";
const faqs = [
  [
    "Preciso trocar o sistema da clínica?",
    "Você pode manter seu sistema clínico. Esta plataforma organiza atendimento comercial, oportunidades e agenda. Não é um prontuário e não substitui diagnóstico ou registro clínico.",
  ],
  [
    "Como conecto o WhatsApp?",
    "A conexão é guiada por QR Code, com confirmação do número. Você pode conectar o número que usa, desde que sua operação permita vinculá-lo. A equipe acompanha a conexão e recebe avisos se precisar reconectar.",
  ],
  [
    "O que acontece se o agente não souber responder?",
    "Ele consulta as informações da clínica. Quando não há uma resposta confirmada ou é necessário um profissional, encaminha para a equipe com contexto. Não deve inventar preços, condições ou orientação clínica.",
  ],
  [
    "Posso assumir a conversa?",
    "Sim. Sua equipe acompanha e assume o atendimento, mantendo o histórico. A devolução ao agente acontece pelo fluxo de controle humano; um agendamento só é confirmado após sucesso no sistema.",
  ],
  [
    "Quando começam os 7 dias?",
    "Depois de confirmar o e-mail, conectar e verificar o WhatsApp, revisar o agente e ativar o atendimento. O teste termina em 7 dias ou ao usar os 1.000 créditos, o que acontecer primeiro. Inclui um usuário e um WhatsApp.",
  ],
  [
    "Como funcionam os créditos?",
    "Cada mensagem completa do agente consome 10 créditos, mesmo dividida em vários envios. A franquia renova mensalmente pelo aniversário da assinatura. Se o saldo acabar, a IA pausa e a equipe pode continuar atendendo durante o período contratado.",
  ],
  [
    "O agente já agenda e faz follow-up ao criar a conta?",
    "O agente vem preparado para o atendimento da clínica. Para agendar, você precisa confirmar serviços, duração e disponibilidade real. Retornos proativos dependem de um fluxo aprovado e dos horários de acompanhamento; não são ligados apenas pelo cadastro.",
  ],
];
export function ClinicLanding({
  name,
  pricing,
}: {
  name: string;
  pricing: { available: boolean; plans: CommercialPlan[] };
}) {
  return (
    <>
      <a href="#conteudo" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <header className={`${styles.header} ${clinic.header}`}>
        <Link href="/" aria-label={`${name} — início`}>
          <Logo name={name} />
        </Link>
        <nav aria-label="Navegação da página de clínicas" className={clinic.nav}>
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <Link href="/login">Entrar</Link>
        </nav>
        <Link href={trial} className={`${styles.button} ${styles.buttonSmall}`}>
          Testar 7 dias grátis
          <ArrowRight size={18} aria-hidden />
        </Link>
      </header>
      <main id="conteudo">
        <section className={`${styles.hero} ${clinic.hero}`} aria-labelledby="clinic-title">
          <div className={styles.heroCopy}>
            <h1 id="clinic-title">
              Seu lead chegou.
              <br />
              <span>O atendimento continua.</span>
            </h1>
            <p>
              Atenda no WhatsApp, entenda o serviço procurado e organize o próximo passo.{" "}
              <strong>CRM e agenda conectados, mesmo quando a recepção está ocupada.</strong>
            </p>
            <div className={styles.heroActions}>
              <Link href={trial} className={styles.button}>
                Testar 7 dias grátis
                <ArrowRight size={19} aria-hidden />
              </Link>
              <a href="#demonstracao" className={styles.textLink}>
                Ver funcionando em uma clínica
                <CaretDown size={17} aria-hidden />
              </a>
            </div>
            <p className={clinic.trialNote}>
              7 dias ou 1.000 créditos após a ativação. Um usuário e um WhatsApp. IA incluída, sem
              configurar chave.
            </p>
          </div>
          <div data-demo-media-slot="clinica">
            <Journey clinicOnly />
          </div>
        </section>
        <section className={`${styles.section} ${clinic.pains}`} aria-labelledby="pains-title">
          <h2 id="pains-title">
            O interesse não precisa
            <br />
            ficar esperando a recepção.
          </h2>
          <div>
            <article>
              <h3>Uma mensagem fora do horário</h3>
              <p>
                O atendimento recebe o contato e entende o serviço procurado, conforme as regras da
                clínica.
              </p>
            </article>
            <article>
              <h3>Uma dúvida de preço sem continuidade</h3>
              <p>
                O agente consulta as condições cadastradas e conduz o próximo passo, sem inventar
                orçamento.
              </p>
            </article>
            <article>
              <h3>Uma avaliação sem retorno</h3>
              <p>
                A equipe vê o histórico e a pendência. Com um fluxo de follow-up configurado, o
                contato pode ser retomado.
              </p>
            </article>
          </div>
        </section>
        <section
          id="como-funciona"
          className={`${styles.section} ${clinic.process}`}
          aria-labelledby="process-title"
        >
          <h2 id="process-title">
            Da primeira mensagem
            <br />
            ao próximo passo combinado.
          </h2>
          <ol>
            {[
              ["Atende", "Recebe o contato no WhatsApp com as orientações da clínica."],
              [
                "Entende",
                "Pergunta o serviço procurado e a preferência de atendimento, uma coisa por vez.",
              ],
              ["Registra", "Organiza a oportunidade e o contexto comercial no CRM."],
              ["Combina", "Consulta a agenda configurada ou encaminha o próximo passo à equipe."],
              ["Acompanha", "Mantém a pendência visível e retoma conforme o fluxo aprovado."],
            ].map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={`${styles.section} ${clinic.trust}`} aria-labelledby="trust-title">
          <div>
            <ShieldCheck size={32} aria-hidden />
            <h2 id="trust-title">
              Sua equipe no controle.
              <br />
              Informação com finalidade.
            </h2>
          </div>
          <div>
            <p>
              Permissões por pessoa, histórico do atendimento e registros de ações ajudam a
              acompanhar a operação.
            </p>
            <ul>
              <li>
                <Check size={18} aria-hidden />O agente se limita ao atendimento comercial e à
                agenda.
              </li>
              <li>
                <Check size={18} aria-hidden />O template evita pedir exames, sintomas e histórico
                clínico desnecessários.
              </li>
              <li>
                <Check size={18} aria-hidden />
                Sua equipe pode assumir a conversa e continuar com o contexto.
              </li>
            </ul>
            <Link href="/legal/privacy">
              Conheça a política de privacidade
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
        <PricingSection plans={pricing.plans} available={pricing.available} />
        <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
          <div>
            <h2 id="faq-title">Antes de começar.</h2>
            <p>Conexão, créditos e controle humano, sem complicar a configuração.</p>
          </div>
          <div>
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <CaretDown size={18} aria-hidden />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <div>
            <h2>
              Seu próximo atendimento
              <br />
              pode começar aqui.
            </h2>
            <p>Conte como sua clínica atende, conecte o WhatsApp e revise seu agente preparado.</p>
            <Link href={trial} className={styles.button}>
              Testar 7 dias grátis
              <ArrowRight size={19} aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Link href="/" aria-label={`${name} — início`}>
            <Logo name={name} />
          </Link>
          <Link href="/">
            Conhecer todos os segmentos
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <div className={styles.footerBottom}>
          <span>{name} · Atendimento, CRM e agenda</span>
          <div>
            <Link href="/legal/terms">Termos de uso</Link>
            <Link href="/legal/privacy">Privacidade</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
