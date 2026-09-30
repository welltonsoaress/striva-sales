"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Bell,
  Brain,
  Buildings,
  CalendarBlank,
  CalendarCheck,
  CaretDown,
  ChatCircle,
  Check,
  Checks,
  Clock,
  Funnel,
  List,
  Lock,
  PaperPlaneTilt,
  ShieldCheck,
  Sparkle,
  Users,
  X,
} from "@/lib/ui/icons";
import styles from "./landing.module.css";

const DEMO_URL = `https://wa.me/5583998391039?text=${encodeURIComponent("Olá! Quero conhecer o sistema e agendar uma demonstração para minha empresa.")}`;
const steps = ["Atendimento", "Follow-up", "Próximo passo"];
const subscribeReady = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

// Evita cliques perdidos enquanto o navegador prepara as interações.
function useInteractiveReady() {
  return useSyncExternalStore(subscribeReady, clientReady, serverReady);
}
const sectors = [
  {
    name: "Clínicas",
    business: "Clínica Aurora",
    challenge:
      "O paciente pergunta à noite. A recepção só volta amanhã. Enquanto isso, o interesse pode esfriar.",
    title: "Mais atenção ao paciente. Mais clareza para a gestão.",
    description:
      "Organize o primeiro contato, tire dúvidas com as informações da clínica e acompanhe cada oportunidade de agendamento.",
    tags: ["Agendamento", "Retomada de contatos", "Equipe de atendimento"],
    contact: "Marina Costa",
    request: "Olá! Gostaria de agendar uma avaliação.",
    answer:
      "Olá, Marina! Vou ajudar com seu agendamento. Você prefere uma avaliação pela manhã ou à tarde?",
    detail: "À tarde. Pode ser na quinta-feira?",
    guidance:
      "Claro. Vou consultar os horários disponíveis e ajudar a escolher o melhor para você.",
    followup:
      "Marina, ainda quer agendar sua avaliação? Posso consultar as opções para quinta à tarde.",
    returnMessage: "Sim! Pode ver um horário para mim, por favor?",
    offer: "Encontrei quinta-feira às 14h30. Esse horário funciona para você?",
    acceptance: "Funciona, pode agendar!",
    confirmation:
      "Pronto, Marina. Sua avaliação ficou agendada para quinta, às 14h30. Se precisar de ajuda, pode chamar por aqui.",
    deal: "Avaliação inicial",
    stage: "Agendamento",
    action: "Avaliação agendada",
    date: "Quinta-feira · 14h30",
  },
  {
    name: "Escritórios",
    business: "Escritório Horizonte",
    challenge:
      "O contato quer conhecer a assessoria, mas a equipe precisa entender a demanda e encontrar um horário para conversar.",
    title: "Cada novo contato com contexto e responsável.",
    description:
      "Entenda a demanda antes da reunião, direcione para a pessoa certa e acompanhe propostas sem depender da memória da equipe.",
    tags: ["Triagem de demandas", "Reuniões", "Acompanhamento de propostas"],
    contact: "Rafael Lima",
    request: "Preciso conversar sobre uma assessoria para minha empresa.",
    answer:
      "Olá, Rafael! Posso ajudar. Você quer conhecer a assessoria ou já tem uma demanda para conversar com a equipe?",
    detail: "Quero conhecer. Podemos conversar na quinta-feira?",
    guidance:
      "Perfeito. Vou consultar a agenda para uma reunião e deixar sua solicitação registrada.",
    followup:
      "Rafael, seguimos com a reunião para conhecer a assessoria? Posso consultar a agenda de quinta para você.",
    returnMessage: "Vamos sim. Pode ser pela manhã?",
    offer: "Temos quinta-feira às 10h. Posso agendar sua reunião nesse horário?",
    acceptance: "Pode, às 10h está ótimo.",
    confirmation:
      "Reunião agendada, Rafael. Sua solicitação já está registrada para a equipe continuar com o contexto certo.",
    deal: "Assessoria empresarial",
    stage: "Reunião",
    action: "Reunião agendada",
    date: "Quinta-feira · 10h",
  },
  {
    name: "Empresas",
    business: "Conecta Serviços",
    challenge:
      "O pedido de orçamento chegou. Entre atender, preparar a proposta e retomar o contato, o comercial precisa de continuidade.",
    title: "Um comercial organizado para vender conversando.",
    description:
      "Qualifique pedidos, acompanhe orçamentos e mantenha o histórico da negociação disponível para quem vai dar continuidade.",
    tags: ["Qualificação", "Orçamentos", "Próxima ação"],
    contact: "Camila Alves",
    request: "Oi! Quero um orçamento para o serviço de vocês.",
    answer:
      "Olá, Camila! Vou ajudar. O serviço é para você ou para uma empresa? Me conte um pouco sobre o que precisa.",
    detail: "Para uma empresa. Quero conhecer as opções e receber uma proposta.",
    guidance: "Entendi. Vou registrar sua necessidade e organizar o próximo passo da proposta.",
    followup:
      "Camila, posso continuar com seu pedido de orçamento? Se ficou alguma dúvida, estou por aqui para ajudar.",
    returnMessage: "Pode sim. Quero seguir com a proposta.",
    offer:
      "Vou encaminhar sua necessidade para a equipe preparar a proposta. Podemos continuar por este WhatsApp?",
    acceptance: "Sim, pode ser por aqui.",
    confirmation:
      "Combinado. Seu pedido ficou registrado, com a equipe responsável e o próximo contato organizado.",
    deal: "Proposta de serviço",
    stage: "Proposta",
    action: "Proposta em acompanhamento",
    date: "Próximo contato · amanhã",
  },
];

function DemoLink({
  children = "Agendar demonstração",
  light = false,
  small = false,
}: {
  children?: React.ReactNode;
  light?: boolean;
  small?: boolean;
}) {
  return (
    <a
      href={DEMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.button} ${light ? styles.buttonLight : ""} ${small ? styles.buttonSmall : ""}`}
    >
      {children}
      <ArrowRight size={19} aria-hidden />
    </a>
  );
}

function Logo({ name }: { name: string }) {
  return (
    <Image
      src="/brand/nova-logo-claro.png"
      alt={name}
      width={168}
      height={56}
      className={styles.logo}
    />
  );
}

function BrandSymbol({ name, className }: { name: string; className?: string }) {
  return (
    <Image
      src="/brand/novo-simbolo.png"
      alt=""
      aria-hidden
      width={180}
      height={180}
      className={className}
      title={name}
    />
  );
}

function BusinessScene() {
  const photoRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const photo = photoRef.current;
    if (!photo || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(photo);
    return () => observer.disconnect();
  }, []);
  return (
    <section className={styles.businessScene} aria-labelledby="business-scene-title">
      <div className={styles.businessSceneCopy}>
        <h2 id="business-scene-title">
          Você cuida da empresa.
          <br />
          <span>Seu comercial continua.</span>
        </h2>
        <p>
          Uma consulta, uma reunião, um dia cheio. Seu cliente pode chamar em qualquer momento. Dê a
          ele um caminho para avançar, mesmo quando sua equipe está ocupada.
        </p>
        <ul>
          <li>
            <ChatCircle aria-hidden size={21} /> Atendimento que acolhe
          </li>
          <li>
            <Bell aria-hidden size={21} /> Acompanhamento que retoma
          </li>
          <li>
            <CalendarCheck aria-hidden size={21} /> Agenda que se organiza
          </li>
        </ul>
        <a href="#demonstracao" className={styles.textLink}>
          Explore o atendimento <ArrowRight size={18} aria-hidden />
        </a>
      </div>
      <div className={styles.businessPhoto} ref={photoRef} data-entered={entered}>
        <Image
          src="/marketing/comercial-em-movimento.png"
          alt="Cena ilustrativa de uma empresária consultando o celular em seu escritório"
          width={1536}
          height={1024}
          sizes="(max-width: 820px) 100vw, 65vw"
          className={styles.businessPhotoImage}
        />
        <div className={styles.photoChat}>
          <div className={styles.photoChatHeader}>
            <ChatCircle size={22} aria-hidden />
            <div>
              <strong>Atendimento no WhatsApp</strong>
              <span>Exemplo de conversa</span>
            </div>
          </div>
          <div className={styles.photoChatBody}>
            <p className={styles.photoIncoming}>
              Olá! Consigo marcar uma avaliação para amanhã?<span>18:42</span>
            </p>
            <p className={styles.photoOutgoing}>
              Claro! Vou consultar a agenda. Você prefere de manhã ou à tarde?
              <span>
                18:42 <Checks size={13} aria-hidden />
              </span>
            </p>
            <p className={styles.photoIncoming}>
              À tarde seria perfeito.<span>18:43</span>
            </p>
          </div>
          <div className={styles.photoOutcome}>
            <CalendarCheck size={21} aria-hidden />
            <div>
              <strong>A conversa tem um próximo passo.</strong>
              <span>Disponibilidade consultada na agenda.</span>
            </div>
          </div>
        </div>
        <span className={styles.photoCaption}>Imagem e conversa ilustrativas.</span>
      </div>
    </section>
  );
}

const INVITATION_KEY = "commercial-demo-invitation-seen";
// Piso em memória quando o navegador não permite sessionStorage.
let invitationSeen = false;

function DemoInvitation({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const invitationRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  function dismiss() {
    if (invitationRef.current?.contains(document.activeElement)) previousFocus.current?.focus();
    setOpen(false);
  }
  useEffect(() => {
    let seen = invitationSeen;
    try {
      seen ||= sessionStorage.getItem(INVITATION_KEY) === "1";
    } catch {
      /* Armazenamento opcional. */
    }
    if (seen) return;
    let remaining = 40_000;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const markSeen = () => {
      invitationSeen = true;
      try {
        sessionStorage.setItem(INVITATION_KEY, "1");
      } catch {
        /* Mantém o piso em memória. */
      }
    };
    const pause = () => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };
    const schedule = () => {
      pause();
      if (document.hidden || invitationSeen) return;
      startedAt = Date.now();
      timer = setTimeout(() => {
        timer = undefined;
        markSeen();
        previousFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
      }, remaining);
    };
    const onDemoClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("a")?.getAttribute("href") !== DEMO_URL)
        return;
      pause();
      markSeen();
      setOpen(false);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    document.addEventListener("click", onDemoClick);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", schedule);
      document.removeEventListener("click", onDemoClick);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (invitationRef.current?.contains(document.activeElement)) previousFocus.current?.focus();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  if (!open) return null;
  return (
    <aside
      ref={invitationRef}
      className={styles.demoInvitation}
      aria-labelledby="demo-invitation-title"
    >
      <button className={styles.invitationClose} onClick={dismiss} aria-label="Dispensar convite">
        <X size={21} aria-hidden />
      </button>
      <BrandSymbol name={name} className={styles.invitationSymbol} />
      <h3 id="demo-invitation-title">Quer ver isso na sua empresa?</h3>
      <p>
        Converse com nossa equipe e veja como organizar seu atendimento, seus contatos e seus
        agendamentos.
      </p>
      <DemoLink small>Quero uma demonstração</DemoLink>
      <button className={styles.invitationLater} onClick={dismiss}>
        Agora não
      </button>
    </aside>
  );
}

function ChatMessage({
  incoming = false,
  time,
  children,
}: {
  incoming?: boolean;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className={incoming ? styles.bubbleIncoming : styles.bubbleOutgoing}>
      {children}
      <span className={styles.messageTime}>
        {time}
        {!incoming && <Checks size={13} aria-hidden />}
      </span>
    </div>
  );
}

function Journey() {
  const ready = useInteractiveReady();
  const [step, setStep] = useState(0);
  const [sector, setSector] = useState(0);
  const example = sectors[sector]!;
  return (
    <div className={styles.journey} id="demonstracao">
      <div className={styles.journeyTop}>
        <span>
          <span className={styles.statusDot} />
          Seu funcionário comercial em ação.
        </span>
        <Sparkle size={18} aria-hidden />
      </div>
      <div className={styles.sectorSwitch} role="group" aria-label="Escolha um exemplo de negócio">
        {sectors.map((item, index) => (
          <button
            disabled={!ready}
            key={item.name}
            onClick={() => setSector(index)}
            aria-pressed={sector === index}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className={styles.stepSwitch} role="group" aria-label="Etapas da jornada de venda">
        {steps.map((label, index) => (
          <button
            disabled={!ready}
            key={label}
            onClick={() => setStep(index)}
            aria-pressed={step === index}
          >
            <span>{index < step ? <Check size={13} aria-hidden /> : index + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <div className={styles.demoWindow}>
        <div className={styles.demoHeader}>
          <span className={styles.contactAvatar}>
            {example.contact
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <span>
            <strong>{example.contact}</strong>
            <small>WhatsApp · Atendimento automático</small>
          </span>
          <ChatCircle size={23} aria-hidden />
        </div>
        <div
          className={styles.journeyScene}
          key={`${sector}-${step}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={styles.demoDate}>
            {step === 2 ? "Depois da retomada" : "O cliente chamou fora do expediente"}
          </span>
          {step < 2 && (
            <>
              <ChatMessage incoming time="21:14">
                {example.request}
              </ChatMessage>
              <ChatMessage time="21:14">{example.answer}</ChatMessage>
            </>
          )}
          {step === 0 && (
            <>
              <ChatMessage incoming time="21:15">
                {example.detail}
              </ChatMessage>
              <ChatMessage time="21:15">{example.guidance}</ChatMessage>
            </>
          )}
          {step === 1 && (
            <>
              <div className={styles.followupMarker}>
                <Clock size={14} aria-hidden /> Após o intervalo configurado sem resposta
              </div>
              <ChatMessage time="10:00">{example.followup}</ChatMessage>
              <ChatMessage incoming time="10:03">
                {example.returnMessage}
              </ChatMessage>
            </>
          )}
          {step === 2 && (
            <>
              <ChatMessage time="10:04">{example.offer}</ChatMessage>
              <ChatMessage incoming time="10:04">
                {example.acceptance}
              </ChatMessage>
              <ChatMessage time="10:05">{example.confirmation}</ChatMessage>
              <div className={styles.appointmentResult}>
                <CalendarCheck size={29} aria-hidden />
                <div>
                  <strong>{example.action}</strong>
                  <span>{example.date}</span>
                  <small>
                    {sector === 2
                      ? "CRM atualizado. Próximo contato definido."
                      : "Agendamento integrado ao Google Agenda."}
                  </small>
                </div>
                <Check size={20} aria-hidden />
              </div>
            </>
          )}
        </div>
        <div className={styles.journeyActivity} aria-live="polite">
          {step === 1 ? <Bell size={19} aria-hidden /> : <Funnel size={19} aria-hidden />}
          <div>
            <strong>
              {step === 1 ? "Follow-up enviado automaticamente" : "CRM atualizado automaticamente"}
            </strong>
            <span>
              {step === 1
                ? "O contato voltou. A negociação continua."
                : `${example.deal} · ${step === 2 ? example.stage : "Em atendimento"}`}
            </span>
          </div>
          <Check size={16} aria-hidden />
        </div>
      </div>
      <p className={styles.demoCaption}>
        Explore as etapas · Demonstração ilustrativa com dados fictícios
      </p>
    </div>
  );
}

const opportunityScenes = [
  {
    label: "Fora do expediente",
    situation: "21h14. Um cliente quer agendar.",
    risk: "Sua equipe já saiu. O cliente espera, perde o interesse ou procura outra empresa.",
    response: "O atendimento continua, mesmo quando sua equipe encerra o dia.",
    actions: [
      "Responde com as informações do negócio",
      "Entende o que o cliente precisa",
      "Consulta a agenda e oferece o próximo passo",
    ],
    outcome: "Interesse recebido. Conversa em andamento.",
  },
  {
    label: "Contato sem resposta",
    situation: "A conversa começou. O cliente sumiu.",
    risk: "O interesse fica perdido no histórico do WhatsApp. Ninguém lembra de retomar.",
    response: "O follow-up faz a conversa voltar a ter um próximo passo.",
    actions: [
      "Identifica o intervalo sem resposta",
      "Retoma conforme o fluxo configurado",
      "Continua com o contexto quando o cliente volta",
    ],
    outcome: "Contato retomado. Nova chance de avançar.",
  },
  {
    label: "Proposta em aberto",
    situation: "O orçamento saiu. Quem acompanha agora?",
    risk: "Sem responsável ou próxima ação, uma boa oportunidade pode ficar parada entre conversas e planilhas.",
    response: "Cada negociação ganha lugar no funil e visibilidade para sua equipe.",
    actions: [
      "Mantém o histórico ligado à oportunidade",
      "Mostra etapa, responsável e próxima ação",
      "Ajuda o gestor a priorizar o que precisa de atenção",
    ],
    outcome: "Negociação visível. Equipe com direção.",
  },
];

function OpportunitySection({ name }: { name: string }) {
  const ready = useInteractiveReady();
  const [selected, setSelected] = useState(0);
  const scene = opportunityScenes[selected]!;
  return (
    <section className={`${styles.section} ${styles.opportunitySection}`} id="como-funciona">
      <div className={styles.sectionHeading}>
        <h2>
          Você atrai o cliente.
          <br />
          <span>Quem faz a venda continuar?</span>
        </h2>
        <p>
          Entre a primeira mensagem e o fechamento, cada próximo passo importa. Veja onde o {name}{" "}
          entra no seu dia a dia.
        </p>
      </div>
      <div
        className={styles.opportunityTabs}
        role="group"
        aria-label="Situações que podem perder oportunidades"
      >
        {opportunityScenes.map((item, index) => (
          <button
            key={item.label}
            disabled={!ready}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.opportunityComparison} aria-live="polite" key={selected}>
        <div className={styles.opportunityRisk}>
          <h3>{scene.situation}</h3>
          <p>{scene.risk}</p>
          <span className={styles.riskConclusion}>Oportunidade em risco de esfriar</span>
        </div>
        <div className={styles.opportunityResponse}>
          <h3>{scene.response}</h3>
          <ol>
            {scene.actions.map((action) => (
              <li key={action}>
                <Check size={17} aria-hidden />
                {action}
              </li>
            ))}
          </ol>
          <strong className={styles.opportunityOutcome}>
            <ArrowRight size={19} aria-hidden />
            {scene.outcome}
          </strong>
        </div>
      </div>
      <p className={styles.scenarioNote}>
        Situações ilustrativas. Atendimento e acompanhamento seguem as regras configuradas para o
        seu negócio.
      </p>
    </section>
  );
}

const operationViews = [
  {
    label: "Atendimento",
    icon: ChatCircle,
    benefit: "Converse enquanto o interesse está vivo.",
    description:
      "Atendimento automático e equipe compartilham o histórico. O cliente recebe atenção; sua equipe encontra o contexto para continuar.",
    result: "Menos tempo procurando contexto. Mais foco no cliente.",
  },
  {
    label: "Follow-up",
    icon: Bell,
    benefit: "Retome a conversa. Reabra a oportunidade.",
    description:
      "O silêncio não precisa encerrar a negociação. Configure o acompanhamento e continue a conversa quando o contato responder.",
    result: "Acompanhamento organizado, além da memória da equipe.",
  },
  {
    label: "Funil",
    icon: Funnel,
    benefit: "Organize o caminho até o fechamento.",
    description:
      "Veja em que etapa cada oportunidade está, quem acompanha e qual ação vem a seguir. Tire o comercial das conversas espalhadas.",
    result: "Cada negócio com etapa, contexto e próximo passo.",
  },
  {
    label: "Agenda",
    icon: CalendarBlank,
    benefit: "Transforme interesse em encontro marcado.",
    description:
      "Seu funcionário digital consulta horários e agenda pela conversa. A integração com Google Agenda conecta o atendimento à rotina da equipe.",
    result: "Do WhatsApp à agenda, com a conversa vinculada.",
  },
  {
    label: "Radar",
    icon: Bell,
    benefit: "Saiba onde sua equipe precisa agir.",
    description:
      "Encontre oportunidades sem próximo passo e negociações que precisam de atenção. Priorize a ação, em vez de procurar problema conversa por conversa.",
    result: "Visibilidade para agir enquanto a oportunidade está aberta.",
  },
];

function OperationPreview({ name }: { name: string }) {
  const ready = useInteractiveReady();
  const [view, setView] = useState("Atendimento");
  const selectedView = operationViews.find((item) => item.label === view)!;
  return (
    <>
      <div className={styles.operationBenefits} aria-live="polite">
        <h3>{selectedView.benefit}</h3>
        <p>{selectedView.description}</p>
      </div>
      <div className={styles.operationPreview}>
        <div className={styles.previewToolbar}>
          <Logo name={name} />
          <span>
            <span className={styles.statusDot} />
            Sua operação conectada
          </span>
        </div>
        <div className={styles.previewBody}>
          <div
            className={styles.previewSidebar}
            role="group"
            aria-label="Explore a plataforma comercial"
          >
            {operationViews.map(({ label, icon: Icon }) => (
              <button
                disabled={!ready}
                key={label}
                onClick={() => setView(label)}
                aria-pressed={view === label}
              >
                <Icon size={19} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <div className={styles.previewContent} aria-live="polite">
            <div className={styles.previewTitle}>
              <h3>
                {view === "Atendimento"
                  ? "Toda conversa tem uma continuidade."
                  : view === "Follow-up"
                    ? "A conversa não terminou no silêncio."
                    : view === "Funil"
                      ? "Saiba onde cada negócio está."
                      : view === "Radar"
                        ? "O que precisa de atenção, à vista."
                        : "O próximo encontro, no seu radar."}
              </h3>
              <span>Exemplo ilustrativo</span>
            </div>
            {view === "Atendimento" ? (
              <div className={styles.inboxPreview}>
                <div className={styles.inboxList}>
                  {["Marina Costa", "Rafael Lima", "Camila Alves"].map((n, i) => (
                    <div key={n}>
                      <span className={styles.contactAvatar}>{n[0]}</span>
                      <span>
                        <strong>{n}</strong>
                        <small>
                          {
                            [
                              "Quero agendar uma avaliação",
                              "Podemos marcar uma reunião?",
                              "Recebi a proposta, obrigada!",
                            ][i]
                          }
                        </small>
                      </span>
                      {i === 0 && <span className={styles.unread}>1</span>}
                    </div>
                  ))}
                </div>
                <div className={styles.inboxConversation}>
                  <span className={styles.inlineBadge}>
                    <ChatCircle size={15} aria-hidden />
                    Atendimento + sua equipe
                  </span>
                  <p>
                    Atendimento automático, follow-up e histórico prontos para sua equipe continuar.
                  </p>
                  <div className={styles.contextNote}>
                    <strong>Contexto para continuar</strong>
                    <span>
                      Marina quer uma avaliação no período da tarde. Prefere quinta-feira.
                    </span>
                    <small>Próxima ação: confirmar o horário com a paciente.</small>
                  </div>
                </div>
              </div>
            ) : view === "Follow-up" ? (
              <div className={styles.followupPreview}>
                <div className={styles.followupContact}>
                  <span className={styles.contactAvatar}>CA</span>
                  <div>
                    <strong>Camila Alves</strong>
                    <small>Proposta de serviço · acompanhamento</small>
                  </div>
                  <span className={styles.inlineBadge}>Conversa retomada</span>
                </div>
                <ol className={styles.followupTimeline}>
                  <li>
                    <Clock size={18} aria-hidden />
                    <div>
                      <strong>O contato deixou de responder</strong>
                      <p>A oportunidade continua registrada no CRM.</p>
                    </div>
                  </li>
                  <li>
                    <Bell size={18} aria-hidden />
                    <div>
                      <strong>Follow-up automático enviado</strong>
                      <p>
                        Após o intervalo configurado: “Camila, posso continuar com seu pedido de
                        orçamento?”
                      </p>
                    </div>
                  </li>
                  <li>
                    <ChatCircle size={18} aria-hidden />
                    <div>
                      <strong>“Pode sim. Quero seguir com a proposta.”</strong>
                      <p>O atendimento continua com o histórico da negociação.</p>
                    </div>
                  </li>
                </ol>
              </div>
            ) : view === "Funil" ? (
              <div className={styles.pipelinePreview}>
                {["Novo contato", "Em negociação", "Agendado", "Fechado"].map((label, i) => (
                  <div key={label}>
                    <h4>
                      <span />
                      {label}
                    </h4>
                    <article>
                      <strong>
                        {["Camila Alves", "Rafael Lima", "Marina Costa", "Diego Martins"][i]}
                      </strong>
                      <p>
                        {
                          [
                            "Proposta de serviço",
                            "Assessoria empresarial",
                            "Avaliação inicial",
                            "Serviço contratado",
                          ][i]
                        }
                      </p>
                      <span>
                        <Clock size={14} aria-hidden />
                        {
                          [
                            "Qualificar interesse",
                            "Acompanhar proposta",
                            "Quinta-feira · 14h30",
                            "Negócio concluído com a equipe",
                          ][i]
                        }
                      </span>
                    </article>
                  </div>
                ))}
              </div>
            ) : view === "Radar" ? (
              <div className={styles.radarPreview}>
                {[
                  {
                    contact: "Camila Alves",
                    reason: "Proposta sem próximo passo",
                    action: "Definir a próxima ação de acompanhamento",
                  },
                  {
                    contact: "Rafael Lima",
                    reason: "Negociação parada na etapa",
                    action: "Revisar a oportunidade com o responsável",
                  },
                  {
                    contact: "Marina Costa",
                    reason: "Follow-up programado",
                    action: "Acompanhamento em andamento",
                  },
                ].map((item) => (
                  <article key={item.contact}>
                    <Bell size={19} aria-hidden />
                    <div>
                      <strong>{item.contact}</strong>
                      <p>{item.reason}</p>
                      <small>{item.action}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.calendarPreview}>
                {["09h00", "10h00", "14h30"].map((hour, i) => (
                  <div key={hour}>
                    <time>{hour}</time>
                    <span>
                      <strong>
                        {
                          [
                            "Reunião com a equipe",
                            "Assessoria · Rafael Lima",
                            "Avaliação · Marina Costa",
                          ][i]
                        }
                      </strong>
                      <small>
                        {i === 0 ? "Agenda da operação" : "Google Agenda · conversa vinculada"}
                      </small>
                    </span>
                    <CalendarCheck size={23} aria-hidden />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.operationResult} aria-live="polite">
          <Check size={19} aria-hidden />
          <span>{selectedView.result}</span>
        </div>
      </div>
    </>
  );
}

function ReportSection() {
  const ready = useInteractiveReady();
  const [weekly, setWeekly] = useState(false);
  return (
    <section className={`${styles.section} ${styles.reportSection}`} id="inteligencia">
      <div className={styles.reportCopy}>
        <h2>
          Menos achismo.
          <br />
          <span>Mais inteligência comercial.</span>
        </h2>
        <p>Não basta automatizar. Você precisa saber o que acontece depois.</p>
        <p>
          Receba resumos diários e comparativos semanais no WhatsApp. Acompanhe a entrada de
          oportunidades, os agendamentos e os negócios que precisam de ação.
        </p>
        <p className={styles.reportInsight}>
          Use os dados do seu comercial para entender a demanda, priorizar a equipe e decidir o
          próximo movimento.
        </p>
      </div>
      <div className={styles.reportPreview}>
        <div
          className={styles.reportControls}
          role="group"
          aria-label="Escolha o período do relatório"
        >
          <button disabled={!ready} aria-pressed={!weekly} onClick={() => setWeekly(false)}>
            Diário
          </button>
          <button disabled={!ready} aria-pressed={weekly} onClick={() => setWeekly(true)}>
            Semanal
          </button>
        </div>
        <div aria-live="polite" className={styles.reportData}>
          <h3>{weekly ? "Sua semana, em perspectiva." : "O que merece sua atenção hoje."}</h3>
          <p>{weekly ? "Comparativo de duas semanas completas" : "Resumo do dia da operação"}</p>
          <dl>
            <div>
              <dt>Novas oportunidades</dt>
              <dd>
                {weekly ? "42" : "12"}
                <span>{weekly ? "36 na semana anterior" : "Criadas hoje"}</span>
              </dd>
            </div>
            <div>
              <dt>Agendamentos confirmados</dt>
              <dd>
                {weekly ? "24" : "8"}
                <span>{weekly ? "20 na semana anterior" : "Para hoje"}</span>
              </dd>
            </div>
            {!weekly && (
              <div>
                <dt>Demandas sem próximo passo</dt>
                <dd>
                  3<span>Veja as prioridades no Radar</span>
                </dd>
              </div>
            )}
          </dl>
          <span className={styles.reportDelivery}>
            <ChatCircle size={18} aria-hidden /> Envio no WhatsApp, nos horários que você
            configurar.
          </span>
        </div>
        <p className={styles.previewCaption}>
          Relatório ilustrativo. Todos os números são fictícios.
        </p>
      </div>
    </section>
  );
}

function SectorSection() {
  const ready = useInteractiveReady();
  const [selected, setSelected] = useState(0);
  const current = sectors[selected]!;
  return (
    <section className={`${styles.section} ${styles.sectorSection}`} id="para-quem">
      <div className={styles.sectionHeading}>
        <h2>
          Imagine esse comercial
          <br />
          <span>na sua empresa.</span>
        </h2>
        <p>
          Três cenários de uso, um objetivo em comum: aproveitar o interesse do cliente e organizar
          o caminho até o próximo negócio.
        </p>
      </div>
      <div className={styles.sectorTabs} role="group" aria-label="Segmentos atendidos">
        {sectors.map((sector, i) => (
          <button
            disabled={!ready}
            key={sector.name}
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            {sector.name}
            <ArrowRight size={19} aria-hidden />
          </button>
        ))}
      </div>
      <div className={styles.sectorDetail} key={selected} aria-live="polite">
        <div>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
          <div className={styles.sectorTags}>
            {current.tags.map((tag) => (
              <span key={tag}>
                <Check size={15} aria-hidden />
                {tag}
              </span>
            ))}
          </div>
          <DemoLink small>Ver para o meu negócio</DemoLink>
        </div>
        <div className={styles.sectorExample}>
          <Buildings size={29} aria-hidden />
          <span>{current.business} · empresa fictícia</span>
          <strong>{current.request}</strong>
          <p className={styles.caseChallenge}>{current.challenge}</p>
          <div>
            <ArrowRight size={20} aria-hidden />
            <p>
              {current.action}
              <small>{current.date}</small>
            </p>
          </div>
          <small>Simulação de uso. Não é depoimento ou resultado de um cliente real.</small>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  [
    "Como funciona esse funcionário digital?",
    "Ele usa inteligência artificial e as orientações do seu negócio para atender no WhatsApp, entender a necessidade, conduzir a conversa e agendar. A plataforma conecta esse trabalho ao CRM e à sua equipe. Você acompanha as conversas e pode assumir o atendimento quando precisar.",
  ],
  [
    "E se o lead parar de responder?",
    "O follow-up automático permite retomar a conversa depois de um intervalo sem resposta. Você configura os fluxos e os horários de acompanhamento. Quando o contato responde, a conversa continua com contexto, ajudando a negociação a avançar. O acompanhamento apoia a venda; o fechamento depende da decisão do cliente.",
  ],
  [
    "Ele atende mesmo fora do expediente?",
    "Sim. O atendimento automático pode funcionar 24 horas por dia, 7 dias por semana, conforme os horários e regras configurados para sua operação. Assim, o primeiro contato não precisa esperar sua equipe voltar. Quando uma pessoa precisa assumir, o histórico acompanha o atendimento.",
  ],
  [
    "Como funciona o agendamento no Google Agenda?",
    "Com a integração conectada e as disponibilidades configuradas, a IA consulta horários e agenda reuniões, consultas ou avaliações durante a conversa. O compromisso fica vinculado ao atendimento e sincronizado com o Google Agenda.",
  ],
  [
    "Quais relatórios eu recebo?",
    "Você pode ativar resumos diários e comparativos semanais pelo WhatsApp, escolhendo os horários de envio. Eles mostram oportunidades criadas, agendamentos confirmados e pontos que precisam de atenção. O painel e o Radar ajudam a entender sua operação e priorizar o próximo passo.",
  ],
  [
    "Minha equipe continua no controle?",
    "Sim. A equipe acompanha as conversas, assume o atendimento e devolve para a IA quando fizer sentido. O histórico e o contexto ajudam a continuar de onde o atendimento parou. Permissões definem o que cada pessoa pode fazer.",
  ],
  [
    "Como a IA conhece minha empresa?",
    "Você configura as informações do negócio, os materiais de referência e as orientações de atendimento. Os agentes usam essa base para responder. O conhecimento e as instruções precisam ser revisados para refletir sua operação.",
  ],
  [
    "Posso gerenciar a operação pelo WhatsApp?",
    "Sim, com o Assistente de gestão configurado para o gestor autorizado. Ele permite consultas, resumos e propostas de ações como criar tarefas, mover oportunidades e transferir atendimentos. As alterações disponíveis exigem sua confirmação.",
  ],
  [
    "Serve para a rotina da minha empresa?",
    "A plataforma permite configurar etapas do funil, agentes, agenda e acompanhamentos. Na demonstração, conversamos sobre seu processo para avaliar como os recursos se encaixam e quais configurações serão necessárias.",
  ],
  [
    "Qual é o investimento?",
    "Converse com nossa equipe para conhecer a proposta comercial e as condições disponíveis para sua operação. A demonstração é o momento de entender os recursos, a configuração e o investimento antes de contratar.",
  ],
];

export function LandingPage({ name }: { name: string }) {
  const ready = useInteractiveReady();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <a href="#" aria-label={`${name} — início`}>
          <Logo name={name} />
        </a>
        <nav className={styles.desktopNav} aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#inteligencia">Gestão</a>
          <a href="#para-quem">Para quem</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.loginLink}>
            Entrar
          </Link>
          <span className={styles.desktopCta}>
            <DemoLink small />
          </span>
          <button
            disabled={!ready}
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
        {menuOpen && (
          <nav id="menu-mobile" className={styles.mobileNav} aria-label="Navegação no celular">
            {[
              ["Como funciona", "#como-funciona"],
              ["Recursos", "#recursos"],
              ["Gestão e relatórios", "#inteligencia"],
              ["Para quem", "#para-quem"],
            ].map(([label, href]) => (
              <a href={href} key={href} onClick={() => setMenuOpen(false)}>
                {label}
                <ArrowRight size={18} aria-hidden />
              </a>
            ))}
            <DemoLink small />
          </nav>
        )}
      </header>
      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <h1 id="hero-title">
              Mais vendas.
              <br />
              Menos oportunidades
              <br />
              <span>perdidas.</span>
            </h1>
            <p>
              <strong>Um funcionário comercial digital que atende, vende e agenda. 24/7.</strong>
              <br />
              Aproveite o interesse de quem chama, retome quem parou de responder e organize cada
              negociação. Atendimento, follow-up, CRM e Google Agenda conectados — com sua equipe no
              controle.
            </p>
            <div className={styles.heroActions}>
              <DemoLink>Quero ver no meu negócio</DemoLink>
              <a href="#demonstracao" className={styles.textLink}>
                Veja uma venda avançar
                <CaretDown size={17} aria-hidden />
              </a>
            </div>
            <div className={styles.heroNote}>
              <span>
                <Check size={16} aria-hidden />
                Atendimento além do expediente
              </span>
              <span>
                <Check size={16} aria-hidden />
                Sua equipe no controle
              </span>
            </div>
          </div>
          <Journey />
        </section>
        <div className={styles.flowStrip} aria-label="Etapas conectadas">
          <span>Atende no WhatsApp</span>
          <ArrowRight aria-hidden />
          <span>Faz follow-up automático</span>
          <ArrowRight aria-hidden />
          <span>Agenda no Google Agenda</span>
          <ArrowRight aria-hidden />
          <strong>Você controla tudo</strong>
        </div>
        <BusinessScene />
        <OpportunitySection name={name} />
        <section className={`${styles.section} ${styles.platformSection}`} id="recursos">
          <div className={styles.sectionHeading}>
            <h2>
              Seu comercial inteiro.
              <br />
              <span>Trabalhando na mesma direção.</span>
            </h2>
            <p>
              Explore as áreas abaixo. Do primeiro “olá” à negociação em andamento, cada conversa,
              agendamento e próxima ação fazem parte da mesma operação.
            </p>
          </div>
          <OperationPreview name={name} />
          <p className={styles.previewCaption}>
            Visualização adaptada dos fluxos do sistema. Nomes e situações são ilustrativos.
          </p>
          <div className={styles.featureRows}>
            <article>
              <ChatCircle size={25} aria-hidden />
              <div>
                <h3>O cliente chamou. Seu comercial atende.</h3>
                <p>
                  Responda dúvidas, entenda a necessidade e conduza a venda com o conhecimento da
                  sua empresa. Mantenha o atendimento ativo também à noite e aos fins de semana.
                </p>
              </div>
            </article>
            <article>
              <Funnel size={25} aria-hidden />
              <div>
                <h3>Menos preenchimento. Mais negociação.</h3>
                <p>
                  O sistema registra informações, qualifica o contato e atualiza etapas durante a
                  conversa. Sua equipe encontra o histórico e o próximo passo, sem recomeçar do
                  zero.
                </p>
              </div>
            </article>
            <article>
              <Bell size={25} aria-hidden />
              <div>
                <h3>O lead sumiu? O follow-up continua.</h3>
                <p>
                  Se o lead para de responder, o sistema retoma a conversa automaticamente, nos
                  intervalos configurados. Tire a negociação do silêncio e ajude o cliente a dar o
                  próximo passo.
                </p>
              </div>
            </article>
            <article>
              <CalendarBlank size={25} aria-hidden />
              <div>
                <h3>Da conversa ao Google Agenda.</h3>
                <p>
                  Seu funcionário digital consulta a disponibilidade e agenda reuniões, consultas ou
                  avaliações. Com a integração conectada, o compromisso fica sincronizado com o
                  Google Agenda.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className={styles.managementSection} id="gestao-whatsapp">
          <div className={styles.managementInner}>
            <div className={styles.managementCopy}>
              <h2>
                Seu comercial
                <br />
                na palma
                <br />
                <span>da sua mão.</span>
              </h2>
              <p>
                Seu funcionário comercial atende os clientes. O Assistente de gestão mantém você
                informado: receba relatórios e dê comandos pelo seu WhatsApp.
              </p>
              <ul>
                <li>
                  <Check size={18} aria-hidden />
                  Consulte oportunidades e agendamentos
                </li>
                <li>
                  <Check size={18} aria-hidden />
                  Receba resumos diários e comparativos semanais
                </li>
                <li>
                  <Check size={18} aria-hidden />
                  Crie tarefas e mova negócios com confirmação
                </li>
              </ul>
              <p className={styles.managementLimit}>
                <ShieldCheck size={18} aria-hidden />
                Ações disponíveis para o gestor autorizado, após ativação. Você confirma as
                alterações.
              </p>
              <DemoLink light>Quero conhecer o assistente</DemoLink>
            </div>
            <div className={styles.phoneComposition}>
              <Image
                src="/marketing/gestao-no-celular.png"
                alt=""
                aria-hidden
                width={1024}
                height={1280}
                sizes="(max-width: 520px) 350px, 510px"
                className={styles.phonePhotograph}
              />
              <div className={styles.phone}>
                <div className={styles.phoneStatus}>
                  <span>9:41</span>
                  <span>•••</span>
                </div>
                <div className={styles.phoneHeader}>
                  <span className={styles.assistantAvatar}>
                    <BrandSymbol name={name} />
                  </span>
                  <div>
                    <strong>Assistente de gestão</strong>
                    <small>Seu negócio, com você.</small>
                  </div>
                  <ShieldCheck size={20} aria-hidden />
                </div>
                <div className={styles.phoneChat}>
                  <span className={styles.phoneDate}>Conversa ilustrativa</span>
                  <div className={styles.phoneIncoming}>Como está meu comercial hoje?</div>
                  <div className={styles.phoneOutgoing}>
                    Aqui está seu resumo:
                    <ul>
                      <li>12 novas oportunidades</li>
                      <li>8 agendamentos confirmados</li>
                      <li>3 oportunidades precisam de atenção</li>
                    </ul>
                    <small>Exemplo com números fictícios.</small>
                  </div>
                  <div className={styles.phoneIncoming}>
                    Crie uma tarefa para revisar as propostas amanhã.
                  </div>
                  <div className={styles.phoneOutgoing}>
                    Preparei a tarefa para amanhã.
                    <br />
                    <strong>Confirme para eu criar.</strong>
                    <span className={styles.confirmation}>
                      <Lock size={14} aria-hidden />
                      Aguarda sua confirmação
                    </span>
                  </div>
                </div>
                <div className={styles.phoneComposer}>
                  <span>Mensagem</span>
                  <PaperPlaneTilt size={19} aria-hidden />
                </div>
              </div>
              <div className={styles.managementSeal}>
                <Check size={17} aria-hidden />
                <span>
                  Você decide.
                  <br />
                  <strong>O sistema acompanha.</strong>
                </span>
              </div>
            </div>
          </div>
        </section>
        <ReportSection />
        <SectorSection />
        <section className={`${styles.section} ${styles.teamSection}`}>
          <div>
            <h2>
              Seu time,
              <br />
              onde faz
              <br />
              <span>a diferença.</span>
            </h2>
            <p>
              Seu funcionário comercial aprende as orientações do negócio e executa as rotinas
              configuradas. Sua equipe entra onde faz diferença, com o contexto pronto para
              continuar.
            </p>
            <DemoLink small />
          </div>
          <div className={styles.teamList}>
            <article>
              <Users size={25} aria-hidden />
              <div>
                <h3>Uma equipe, um contexto</h3>
                <p>
                  Distribuição de atendimentos, responsáveis definidos e histórico disponível para
                  continuar a conversa.
                </p>
              </div>
            </article>
            <article>
              <Brain size={25} aria-hidden />
              <div>
                <h3>Conhecimento que acompanha o negócio</h3>
                <p>
                  Ensine seus agentes e revise propostas de melhoria. A evolução passa pela sua
                  aprovação.
                </p>
              </div>
            </article>
            <article>
              <ShieldCheck size={25} aria-hidden />
              <div>
                <h3>Controle para quem administra</h3>
                <p>
                  Permissões de acesso, registros de atividade e recursos para gestão de
                  solicitações de privacidade.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className={`${styles.section} ${styles.faqSection}`} id="duvidas">
          <h2>
            Antes de dar
            <br />o próximo passo.
          </h2>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <CaretDown size={21} aria-hidden />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <BrandSymbol name={name} className={styles.finalSymbol} />
          <div>
            <h2>
              Seu próximo negócio
              <br />
              pode começar na próxima mensagem.
            </h2>
            <p>
              Veja o {name} aplicado ao seu processo comercial. Na demonstração, conheça o
              atendimento, o acompanhamento dos contatos e o controle da operação para a sua
              empresa.
            </p>
            <DemoLink>Quero ver funcionando</DemoLink>
            <span className={styles.finalNote}>Demonstração com nossa equipe pelo WhatsApp.</span>
          </div>
        </section>
      </main>
      <DemoInvitation name={name} />
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div>
            <Logo name={name} />
            <p>Seu sistema operacional de vendas.</p>
          </div>
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">
            Fale com nossa equipe
            <ArrowSquareOut size={17} aria-hidden />
          </a>
          <Link href="/login">
            Acessar a plataforma
            <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {name}. Todos os direitos reservados.
          </span>
          <div>
            <a href="#duvidas">Dúvidas</a>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">
              Atendimento comercial
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
