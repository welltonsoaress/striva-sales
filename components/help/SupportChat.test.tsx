import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SupportChat } from "./SupportChat";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "user-qa" }, activeOrg: { orgId: "org-qa" } }),
}));
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({ useRealtimeChannel: () => {} }));
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScroll);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
});

it("carrega o histórico antes de liberar a digitação e preserva a pergunta no envio", async () => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
  let finishHistory!: (response: Response) => void;
  const initialHistory = new Promise<Response>((resolve) => { finishHistory = resolve; });
  const history = () => Response.json({ data: { thread: null, messages: [] } });
  const fetchMock = vi.fn()
    .mockReturnValueOnce(initialHistory)
    .mockResolvedValueOnce(Response.json({ data: { thread_id: "thread-qa" } }))
    .mockResolvedValueOnce(history());
  vi.stubGlobal("fetch", fetchMock);
  render(<SupportChat />);
  fireEvent.click(screen.getByRole("button", { name: "Suporte" }));
  // A abertura já bloqueia o campo: não há intervalo em que um rascunho
  // possa entrar antes do carregamento e desaparecer no próximo render.
  expect(screen.getByLabelText("Sua pergunta")).toBeDisabled();
  await act(async () => { finishHistory(history()); });
  await waitFor(() => expect(screen.getByLabelText("Sua pergunta")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Sua pergunta"), { target: { value: "Preciso de ajuda" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({
    action: "send", body: "Preciso de ajuda",
  });
  await waitFor(() => expect(screen.getByLabelText("Sua pergunta")).toHaveValue(""));
});
