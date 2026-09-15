"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

export type TinyClient = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

type Ctx = {
  clients: TinyClient[];
  current: TinyClient | null;
  selectClient: (id: string) => void;
  loading: boolean;
  error: string | null;
  // Controle de segredos revelados: limpa tudo ao trocar cliente, sair da tela, etc.
  revealedRegistry: Map<string, { value: string; expiresAt: number }>;
  registerRevealed: (id: string, value: string, ttlMs?: number) => void;
  getRevealed: (id: string) => string | null;
  clearRevealed: (filterId?: string) => void;
  // Clipboard (registra tentativa; sucesso de escrita depende navegador)
  lastCopyAt: number | null;
  markCopied: () => void;
};

const CtxClient = createContext<Ctx | null>(null);

export function ClientProvider({
  userId,
  children
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [clients, setClients] = useState<TinyClient[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revealed = useRef(new Map<string, { value: string; expiresAt: number }>());
  const [tick, setTick] = useState(0);
  const [lastCopyAt, setLastCopyAt] = useState<number | null>(null);

  // Carrega lista de clientes autorizados e escolhe o primeiro (ou último escolhido via localStorage, sem segredos)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clients", {
          credentials: "include",
          cache: "no-store"
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Falha ao carregar clientes (HTTP ${res.status}): ${t.slice(0, 80)}`);
        }
        const data = (await res.json()) as {
          clients: (TinyClient & { membership?: unknown })[];
        };
        const list: TinyClient[] = (data.clients ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          logoUrl: c.logoUrl ?? null
        }));
        if (cancelled) return;
        setClients(list);
        // preferência: localStorage só guarda id; nunca segredos
        let chosen: string | null = null;
        try {
          const stored = window.localStorage.getItem("passvgon.lastClientId");
          if (stored && list.find((c) => c.id === stored)) chosen = stored;
        } catch {
          /* ignore */
        }
        if (!chosen && list[0]) chosen = list[0].id;
        setCurrentId(chosen);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar clientes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Seletor de cliente: LIMPA segredos revelados (exigência do produto)
  const selectClient = useCallback((id: string) => {
    revealed.current.clear();
    setTick((x) => x + 1);
    setCurrentId(id);
    try {
      window.localStorage.setItem("passvgon.lastClientId", id);
    } catch {
      /* ignore */
    }
  }, []);

  const registerRevealed = useCallback(
    (id: string, value: string, ttlMs = 15_000) => {
      revealed.current.set(id, { value, expiresAt: Date.now() + ttlMs });
      setTick((x) => x + 1);
      // Limpa automaticamente após TTL curto
      window.setTimeout(() => {
        revealed.current.delete(id);
        setTick((x) => x + 1);
      }, ttlMs);
    },
    []
  );

  const getRevealed = useCallback(
    (id: string) => {
      void tick; // lê tick para re-render quando expira
      const entry = revealed.current.get(id);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        revealed.current.delete(id);
        return null;
      }
      return entry.value;
    },
    [tick]
  );

  const clearRevealed = useCallback((filterId?: string) => {
    if (filterId) revealed.current.delete(filterId);
    else revealed.current.clear();
    setTick((x) => x + 1);
  }, []);

  const markCopied = useCallback(() => setLastCopyAt(Date.now()), []);

  // Limpeza global ao trocar aba / fechar aba (segredos nunca persistir em lugar nenhum)
  useEffect(() => {
    const h = () => revealed.current.clear();
    window.addEventListener("pagehide", h);
    window.addEventListener("beforeunload", h);
    return () => {
      window.removeEventListener("pagehide", h);
      window.removeEventListener("beforeunload", h);
    };
  }, []);

  const current = useMemo(
    () => (currentId ? clients.find((c) => c.id === currentId) ?? null : null),
    [clients, currentId]
  );

  const value: Ctx = {
    clients,
    current,
    selectClient,
    loading,
    error,
    revealedRegistry: revealed.current,
    registerRevealed,
    getRevealed,
    clearRevealed,
    lastCopyAt,
    markCopied
  };

  return <CtxClient.Provider value={value}>{children}</CtxClient.Provider>;
}

export function useClient(): Ctx {
  const ctx = useContext(CtxClient);
  if (!ctx) throw new Error("useClient deve ser usado dentro de ClientProvider");
  return ctx;
}
