"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";

type Role = "analista" | "vendedor";
type Status =
  | "Nova solicitação"
  | "Solicitação"
  | "Em análise"
  | "Aprovado"
  | "Reprovado"
  | "Implantado";

type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  isPending?: boolean;
};

type RequestItem = {
  id: string;
  unidade: string;
  vendedor: string;
  codigo: string;
  descricao: string;
  volume: number;
  unidadeMedida: string;
  status: Status;
  data: string;
  previsao: string;
  rit: string;
  observacao: string;
};

type AuditLog = {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: "Nova solicitação" | "Edição da solicitação";
  details: string;
  requestId?: string;
  requestCode?: string;
};

type DateFilter = "todos" | "hoje" | "semana" | "mes-atual" | "mes-passado";

const STORAGE_KEY = "am-estoque-demandas";
const LOG_KEY = "am-estoque-logs";
const USERS_KEY = "am-estoque-users";
const CURRENT_USER_KEY = "am-estoque-current-user";
const INVITE_TOKENS_KEY = "am-estoque-invite-tokens";

const defaultUsers: User[] = [
  {
    id: "u-analista",
    name: "Analista",
    username: "analista",
    email: "analista@arcelormittal.com",
    password: "analista123",
    role: "analista",
  },
  {
    id: "u-vendedor-1",
    name: "Vendedor João",
    username: "vendedor",
    email: "joao@arcelormittal.com",
    password: "vendedor123",
    role: "vendedor",
  },
  {
    id: "u-vendedor-2",
    name: "Vendedor Maria",
    username: "maria",
    email: "maria@arcelormittal.com",
    password: "maria123",
    role: "vendedor",
  },
];

const mergeProtectedUsers = (list: Partial<User>[]): User[] => {
  const seen = new Set<string>();
  const merged: User[] = [];

  [...defaultUsers, ...list].forEach((user) => {
    const candidate = normalizeUser(user);
    const key = candidate.email.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(candidate);
  });

  return merged;
};

const initialData: RequestItem[] = [
  {
    id: "1",
    unidade: "9666",
    vendedor: "Pedro Viana",
    codigo: "214597",
    descricao: "TB RD G1 21,30X1,55G6000-135-MET",
    volume: 21,
    unidadeMedida: "KG",
    status: "Nova solicitação",
    data: "2026-09-02",
    previsao: "02.09.2026",
    rit: "RITM1175999",
    observacao: "Solicitação aberta pela unidade.",
  },
  {
    id: "2",
    unidade: "9666",
    vendedor: "Pedro Viana",
    codigo: "107225",
    descricao: "TELA SOLDADA S053 2,45M X 6,00M",
    volume: 300,
    unidadeMedida: "PC",
    status: "Implantado",
    data: "2026-03-08",
    previsao: "28.09.2026",
    rit: "RITM1177202",
    observacao: "Pedido já aprovado e em execução.",
  },
  {
    id: "3",
    unidade: "9666",
    vendedor: "Pedro Lucas",
    codigo: "214497",
    descricao: "TB RD BQ 50,80X2,00X6000-30",
    volume: 2000,
    unidadeMedida: "KG",
    status: "Nova solicitação",
    data: "2026-09-02",
    previsao: "05.10.2026",
    rit: "RITM1176012",
    observacao: "Demanda nova aguardando análise.",
  },
  {
    id: "4",
    unidade: "9666",
    vendedor: "Miriam",
    codigo: "313828",
    descricao: "PF I W 200 19,3 A 572 GR50 12M 41",
    volume: 7,
    unidadeMedida: "PC",
    status: "Solicitação",
    data: "2026-09-02",
    previsao: "15.09.2026",
    rit: "RITM1177013",
    observacao: "Aguardando aprovação da matriz.",
  },
  {
    id: "5",
    unidade: "9666",
    vendedor: "Fernanda",
    codigo: "249928",
    descricao: "TB QD G15X15,0X95G6000-135-MET",
    volume: 100,
    unidadeMedida: "KG",
    status: "Aprovado",
    data: "2026-09-04",
    previsao: "15.09.2026",
    rit: "RITM1177720",
    observacao: "Aprovado pelo analista e encaminhado.",
  },
  {
    id: "6",
    unidade: "9666",
    vendedor: "Pedro Lucas",
    codigo: "214522",
    descricao: "TB RD BQ 63,50X2,00X6000-30",
    volume: 350,
    unidadeMedida: "KG",
    status: "Reprovado",
    data: "2026-09-04",
    previsao: "-",
    rit: "RITM1177749",
    observacao: "Reprovado por divergência de especificação.",
  },
];

const statusOptions: Status[] = [
  "Nova solicitação",
  "Solicitação",
  "Em análise",
  "Aprovado",
  "Reprovado",
  "Implantado",
];

const statusClasses: Record<Status, string> = {
  "Nova solicitação": "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  Solicitação: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  "Em análise": "bg-sky-500/15 text-sky-200 border border-sky-400/30",
  Aprovado: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  Reprovado: "bg-red-500/15 text-red-200 border border-red-400/30",
  Implantado: "bg-violet-500/15 text-violet-200 border border-violet-400/30",
};

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "todos", label: "Todos os períodos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes-atual", label: "Mês atual" },
  { value: "mes-passado", label: "Mês passado" },
];

const parseDateValue = (value: string) => {
  if (!value) return null;

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchesDateFilter = (value: string, filter: DateFilter) => {
  const date = parseDateValue(value);
  if (!date) return false;

  const now = new Date();

  if (filter === "todos") return true;

  if (filter === "hoje") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }

  if (filter === "semana") {
    const start = new Date(now);
    const day = start.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }

  if (filter === "mes-atual") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return date >= start && date <= end;
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return date >= start && date <= end;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeUser = (user: Partial<User>): User => {
  const fallbackName = user.name ?? user.username ?? "Usuário";
  const fallbackUsername = (user.username ?? user.email?.split("@")[0] ?? fallbackName).toString().trim();
  const fallbackEmail = (user.email ?? `${fallbackUsername}@arcelormittal.com`).toString().trim().toLowerCase();

  return {
    id: user.id ?? makeId(),
    name: fallbackName,
    username: fallbackUsername,
    email: fallbackEmail,
    password: user.password ?? "",
    role: user.role === "analista" ? "analista" : "vendedor",
    isPending: user.password ? false : true,
  };
};

const getUsers = (): User[] => {
  const saved = localStorage.getItem(USERS_KEY);
  const users = saved ? JSON.parse(saved) : defaultUsers;
  const list = Array.isArray(users) ? users : defaultUsers;
  const normalized = list.map(normalizeUser);

  if (saved) {
    localStorage.setItem(USERS_KEY, JSON.stringify(normalized));
  }

  return normalized;
};

const syncUsersFromServer = async () => {
  try {
    const response = await fetch("/api/users");
    if (!response.ok) {
      const fallbackUsers = mergeProtectedUsers(getUsers());
      return fallbackUsers;
    }

    const data = await response.json();
    const serverUsers = Array.isArray(data?.users) ? data.users : [];
    const normalizedUsers = mergeProtectedUsers(serverUsers);
    localStorage.setItem(USERS_KEY, JSON.stringify(normalizedUsers));
    return normalizedUsers;
  } catch (error) {
    console.error("Failed to sync users from server:", error);
    return mergeProtectedUsers(getUsers());
  }
};

const getInviteTokens = (): Array<{ id: string; userId: string; email: string; token: string; createdAt: string; used: boolean }> => {
  const saved = localStorage.getItem(INVITE_TOKENS_KEY);
  const parsed = saved ? JSON.parse(saved) : [];
  return Array.isArray(parsed) ? parsed : [];
};

const markInviteUsed = (userId: string) => {
  const tokens = getInviteTokens().map((token) =>
    token.userId === userId ? { ...token, used: true } : token,
  );
  localStorage.setItem(INVITE_TOKENS_KEY, JSON.stringify(tokens));
};

const buildInviteLink = (user: User) => {
  const token = makeId();
  const tokens = getInviteTokens();
  const nextTokens = [...tokens, {
    id: token,
    userId: user.id,
    email: user.email,
    token,
    createdAt: new Date().toISOString(),
    used: false,
  }];
  localStorage.setItem(INVITE_TOKENS_KEY, JSON.stringify(nextTokens));

  const url = new URL(window.location.href);
  url.searchParams.set("invite", token);
  url.hash = "";

  return url.toString();
};

const addAuditLog = (
  currentUser: User | null,
  action: AuditLog["action"],
  details: string,
  requestId?: string,
  requestCode?: string,
) => {
  if (!currentUser) return;

  const entry: AuditLog = {
    id: makeId(),
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    role: currentUser.role,
    action,
    details,
    requestId,
    requestCode,
  };

  const saved = localStorage.getItem(LOG_KEY);
  const logs: AuditLog[] = saved ? JSON.parse(saved) : [];
  const nextLogs = [entry, ...logs].filter(
    (log) => log.action === "Nova solicitação" || log.action === "Edição da solicitação",
  );
  localStorage.setItem(LOG_KEY, JSON.stringify(nextLogs.slice(0, 60)));
};

export default function Home() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [requestDateFilter, setRequestDateFilter] = useState<DateFilter>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [logsFilter, setLogsFilter] = useState<"mine" | "all">("mine");
  const [logsDateFilter, setLogsDateFilter] = useState<DateFilter>("todos");
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [showForm, setShowForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [activeAnalystTab, setActiveAnalystTab] = useState<"solicitacoes" | "usuarios">("solicitacoes");
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [draftChanges, setDraftChanges] = useState<Record<string, Partial<RequestItem>>>({});
  const [form, setForm] = useState({
    unidade: "9666",
    vendedor: "",
    codigo: "",
    descricao: "",
    volume: "",
    unidadeMedida: "KG",
  });
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "vendedor" as Role,
  });

  const isAnalyst = currentUser?.role === "analista";

  useEffect(() => {
    const hydrateUsers = async () => {
      const serverUsers = await syncUsersFromServer();
      setUsers(serverUsers);
    };

    void hydrateUsers();

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    if (inviteToken) {
      fetch(`/api/invite?token=${encodeURIComponent(inviteToken)}`)
        .then((response) => response.json())
        .then((result) => {
          if (result?.user) {
            setLoginForm((current) => ({ ...current, username: result.user.email }));
            alert("Convite validado. Crie sua senha para entrar no sistema.");
          }
        })
        .catch(() => undefined);
    }

    const savedRequests = window.localStorage.getItem(STORAGE_KEY);
    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    } else {
      setRequests(initialData);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }

    const savedLogs = window.localStorage.getItem(LOG_KEY);
    if (savedLogs) {
      setAuditLogs(JSON.parse(savedLogs));
    } else {
      const initialLogs: AuditLog[] = [];
      setAuditLogs(initialLogs);
      window.localStorage.setItem(LOG_KEY, JSON.stringify(initialLogs));
    }

    const savedUser = window.localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (!requests.length) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    setLastUpdated(new Date().toISOString());
  }, [requests]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    if (!users.length) return;
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "vendedor") {
      setForm((previous) => ({ ...previous, vendedor: currentUser.name }));
    }
  }, [currentUser]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesStatus = filterStatus === "Todos" || item.status === filterStatus;
      const matchesDate = matchesDateFilter(item.data, requestDateFilter);
      const matchesQuery =
        !term ||
        [item.unidade, item.vendedor, item.codigo, item.descricao, item.rit]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesDate && matchesQuery;
    });
  }, [requests, filterStatus, requestDateFilter, searchTerm]);

  const visibleLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (log.action !== "Nova solicitação" && log.action !== "Edição da solicitação") return false;
      if (!matchesDateFilter(log.timestamp, logsDateFilter)) return false;
      if (!currentUser) return false;
      if (currentUser.role === "analista") return true;
      return log.userId === currentUser.id;
    });
  }, [auditLogs, currentUser, logsDateFilter]);

  const totalByStatus = useMemo(
    () =>
      statusOptions.reduce(
        (acc, status) => {
          acc[status] = requests.filter((item) => item.status === status).length;
          return acc;
        },
        {} as Record<Status, number>,
      ),
    [requests],
  );

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, number>();
    requests.forEach((item) => {
      const key = `${item.unidade}|${item.codigo}|${item.descricao}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    });
    return [...groups.entries()].filter(([, count]) => count > 1).length;
  }, [requests]);

  const handleLogin = async () => {
    const savedUsers = getUsers();
    const loginValue = loginForm.username.trim().toLowerCase();
    const passwordValue = loginForm.password.trim();

    const matchedUser = savedUsers.find((user) => {
      const username = (user.username ?? "").trim().toLowerCase();
      const email = (user.email ?? "").trim().toLowerCase();
      return username === loginValue || email === loginValue;
    });

    if (!matchedUser) {
      alert("Usuário ou e-mail não encontrado.");
      return;
    }

    if (!matchedUser.password || matchedUser.password === "") {
      const response = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: matchedUser.email, password: passwordValue }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result?.error ?? "Não foi possível criar a senha.");
        return;
      }

      const authenticatedUser = { ...matchedUser, ...result.user, password: passwordValue, isPending: false };
      markInviteUsed(matchedUser.id);
      setCurrentUser(authenticatedUser);
      setLoginForm({ username: "", password: "" });
      window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
      return;
    }

    if (matchedUser.password !== passwordValue) {
      alert("Senha inválida.");
      return;
    }

    setCurrentUser(matchedUser);
    setLoginForm({ username: "", password: "" });
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matchedUser));
  };

  const handleCreateUser = async () => {
    if (!isAnalyst) return;

    const name = newUserForm.name.trim();
    const username = newUserForm.username.trim();
    const email = newUserForm.email.trim().toLowerCase();
    const password = newUserForm.password.trim();

    if (!name || !username || !email || !password) {
      alert("Preencha nome, usuário, e-mail e senha.");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          role: newUserForm.role,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result?.error ?? "Não foi possível criar o usuário.");
        return;
      }

      const nextUsers = mergeProtectedUsers([...getUsers(), result.user]);
      setUsers(nextUsers);
      localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));

      alert(`Usuário ${name} cadastrado com sucesso.`);
      setNewUserForm({ name: "", username: "", email: "", password: "", role: "vendedor" });
      setShowUserForm(false);
    } catch (error) {
      console.error(error);
      alert("Não foi possível criar o usuário.");
    }
  };

  const resetUserPassword = async (userId: string) => {
    if (!isAnalyst || !currentUser) return;

    const target = users.find((user) => user.id === userId);
    if (!target || target.id === currentUser.id) return;

    const confirmed = window.confirm(`Deseja realmente resetar a senha de ${target.name}?`);
    if (!confirmed) return;

    const response = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target.email }),
    });

    const result = await response.json();
    if (!response.ok) {
      alert(result?.error ?? "Não foi possível redefinir a senha.");
      return;
    }

    const nextUsers = users.map((user) =>
      user.id === userId ? { ...user, password: "", isPending: true } : user,
    );
    setUsers(nextUsers.map(normalizeUser));
    localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers.map(normalizeUser)));

    alert(`A senha de ${target.name} foi redefinida. O usuário deve criar uma nova senha no próximo acesso.`);
  };

  const deleteUser = async (userId: string) => {
    if (!isAnalyst || !currentUser) return;

    const target = users.find((user) => user.id === userId);
    if (!target || target.id === currentUser.id) return;

    const confirmed = window.confirm(`Deseja realmente excluir o usuário ${target.name}?`);
    if (!confirmed) return;

    const nextUsers = users.filter((user) => user.id !== userId);
    setUsers(nextUsers.map(normalizeUser));
    localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers.map(normalizeUser)));

    if (currentUser.id === userId) {
      setCurrentUser(null);
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    try {
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        alert(result?.error ?? "Não foi possível excluir o usuário no servidor.");
        const fallbackUsers = mergeProtectedUsers(getUsers());
        setUsers(fallbackUsers);
        localStorage.setItem(USERS_KEY, JSON.stringify(fallbackUsers));
        return;
      }

      const refreshedUsers = mergeProtectedUsers(getUsers().filter((user) => user.id !== userId));
      setUsers(refreshedUsers);
      localStorage.setItem(USERS_KEY, JSON.stringify(refreshedUsers));
    } catch (error) {
      console.error(error);
      const fallbackUsers = mergeProtectedUsers(getUsers());
      setUsers(fallbackUsers);
      localStorage.setItem(USERS_KEY, JSON.stringify(fallbackUsers));
    }

    alert(`O usuário ${target.name} foi excluído.`);
  };

  const handleSubmit = () => {
    if (!currentUser) return;
    if (!form.codigo || !form.descricao || !form.volume) {
      return;
    }

    const requestOwner = (currentUser.role === "vendedor" ? currentUser.name : (form.vendedor || currentUser.name)).trim();
    const newRequest: RequestItem = {
      id: makeId(),
      unidade: form.unidade,
      vendedor: requestOwner,
      codigo: form.codigo,
      descricao: form.descricao,
      volume: Number(form.volume),
      unidadeMedida: form.unidadeMedida,
      status: "Nova solicitação",
      data: new Date().toISOString(),
      previsao: "-",
      rit: "-",
      observacao: currentUser.role === "vendedor"
        ? `Solicitação registrada por ${currentUser.name}.`
        : `Solicitação registrada pelo analista ${currentUser.name}.`,
    };

    setRequests((current) => [newRequest, ...current]);
    addAuditLog(currentUser, "Nova solicitação", `Criação da demanda ${newRequest.codigo}.`, newRequest.id, newRequest.codigo);
    setAuditLogs(JSON.parse(localStorage.getItem(LOG_KEY) ?? JSON.stringify([])));

    setForm({
      unidade: "9666",
      vendedor: currentUser.name,
      codigo: "",
      descricao: "",
      volume: "",
      unidadeMedida: "KG",
    });
    setShowForm(true);
  };

  const updateDraftField = (id: string, field: keyof RequestItem, value: string | number) => {
    if (!isAnalyst) return;

    setDraftChanges((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {}),
        [field]: field === "volume" ? Number(value) : value,
      },
    }));
  };

  const handleStatusDraftChange = (id: string, nextStatus: Status) => {
    if (!isAnalyst) return;

    setDraftChanges((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {}),
        status: nextStatus,
        observacao:
          nextStatus === "Aprovado"
            ? "Pedido aprovado pelo analista."
            : nextStatus === "Reprovado"
              ? "Pedido reprovado pelo analista."
              : nextStatus === "Implantado"
                ? "Material implantado e pendente de conclusão."
                : "Solicitação atualizada pelo analista.",
      },
    }));
  };

  const saveRequestChanges = (id: string) => {
    if (!isAnalyst || !currentUser) return;

    const currentItem = requests.find((item) => item.id === id);
    const pendingEdit = draftChanges[id];
    if (!currentItem || !pendingEdit) return;

    const nextItem = {
      ...currentItem,
      ...pendingEdit,
    } as RequestItem;

    const changedFields = Object.entries({
      unidade: currentItem.unidade,
      vendedor: currentItem.vendedor,
      codigo: currentItem.codigo,
      descricao: currentItem.descricao,
      volume: currentItem.volume,
      unidadeMedida: currentItem.unidadeMedida,
      status: currentItem.status,
      previsao: currentItem.previsao,
      rit: currentItem.rit,
      observacao: currentItem.observacao,
    }).filter(([key, previousValue]) => {
      const nextValue = nextItem[key as keyof RequestItem];
      return String(previousValue) !== String(nextValue);
    });

    if (!changedFields.length) {
      setDraftChanges((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }

    const formattedChanges = changedFields
      .map(([field, previousValue]) => {
        const nextValue = nextItem[field as keyof RequestItem];
        return `${field}: "${String(previousValue)}" → "${String(nextValue)}"`;
      })
      .join("; ");

    setRequests((current) => current.map((item) => (item.id === id ? nextItem : item)));
    addAuditLog(
      currentUser,
      "Edição da solicitação",
      `Alteração da solicitação ${currentItem.codigo}: ${formattedChanges}.`,
      currentItem.id,
      currentItem.codigo,
    );
    setAuditLogs(JSON.parse(localStorage.getItem(LOG_KEY) ?? JSON.stringify([])));

    setDraftChanges((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const toggleRequestSelection = (id: string) => {
    if (!isAnalyst) return;

    setSelectedForDeletion((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  };

  const deleteRequest = (id: string) => {
    if (!isAnalyst || !currentUser) return;

    const target = requests.find((item) => item.id === id);
    if (!target) return;

    const confirmed = window.confirm(`Deseja realmente excluir a solicitação ${target.codigo}?`);
    if (!confirmed) return;

    const nextRequests = requests.filter((item) => item.id !== id);
    setRequests(nextRequests);
    setSelectedForDeletion((current) => current.filter((itemId) => itemId !== id));
    addAuditLog(
      currentUser,
      "Edição da solicitação",
      `Exclusão da solicitação ${target.codigo}: código removido do sistema.`,
      target.id,
      target.codigo,
    );
    setAuditLogs(JSON.parse(localStorage.getItem(LOG_KEY) ?? JSON.stringify([])));
  };

  const deleteSelectedRequests = () => {
    if (!isAnalyst || !currentUser || !selectedForDeletion.length) return;

    const targets = requests.filter((item) => selectedForDeletion.includes(item.id));
    const confirmed = window.confirm(
      `Deseja realmente excluir ${targets.length} solicitação(ões) selecionada(s)?`,
    );
    if (!confirmed) return;

    setRequests((current) => current.filter((item) => !selectedForDeletion.includes(item.id)));
    targets.forEach((target) => {
      addAuditLog(
        currentUser,
        "Edição da solicitação",
        `Exclusão da solicitação ${target.codigo}: código removido do sistema.`,
        target.id,
        target.codigo,
      );
    });
    setAuditLogs(JSON.parse(localStorage.getItem(LOG_KEY) ?? JSON.stringify([])));
    setSelectedForDeletion([]);
  };

  const exportXlsx = () => {
    const columns = [
      "Unidade",
      "Vendedor",
      "Código",
      "Descrição",
      "Volume",
      "UDM",
      "Status",
      "Data",
      "Previsão",
      "RIT",
    ];

    const rows = filteredRequests.map((item) => [
      item.unidade,
      item.vendedor,
      item.codigo,
      item.descricao,
      item.volume,
      item.unidadeMedida,
      item.status,
      formatDate(item.data),
      item.previsao,
      item.rit,
    ]);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitações");
    XLSX.writeFile(workbook, "solicitacoes-arcelor.xlsx");
  };

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-[#d7a24a]/30 bg-[#171d28] p-8 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d7a24a]">ArcelorMittal</p>
          <h1 className="mt-3 text-3xl font-black text-white">Acesso</h1>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Usuário ou e-mail</label>
              <input
                value={loginForm.username}
                onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-white outline-none"
                placeholder="analista ou analista@arcelormittal.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-white outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="w-full rounded-xl bg-[#d7a24a] px-4 py-3 text-sm font-bold text-[#10151d] hover:bg-[#e4b564]"
            >
              Entrar
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f172a] p-4 text-sm text-slate-300">
            <p className="mb-2 font-semibold text-white">Credenciais de teste:</p>
            <p>Analista: analista / analista123</p>
            <p>Vendedor: vendedor / vendedor123</p>
            <p>Vendedor: maria / maria123</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-[#d7a24a]/30 bg-[#1b1f27] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d7a24a]">ArcelorMittal</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Painel de solicitações</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#d7a24a]/40 bg-[#d7a24a]/10 px-3 py-1.5 text-sm text-[#f9d59a]">
                {currentUser.name} · {currentUser.role}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  window.localStorage.removeItem(CURRENT_USER_KEY);
                }}
                className="rounded-xl border border-white/10 bg-[#10151d] px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/20"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{requests.length}</span>
                <span className="text-sm text-slate-400"> </span>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">NOVA SOLICITAÇÃO</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{totalByStatus["Nova solicitação"] ?? 0}</span>
                <span className="text-sm text-amber-300">Últimas 48h</span>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Em análise</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{totalByStatus["Em análise"] ?? 0}</span>
                <span className="text-sm text-sky-300">Aguardando aprovação</span>
              </div>
            </div>
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-red-200">Duplicadas</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{duplicateGroups}</span>
                <span className="text-sm text-red-300">Agrupadas</span>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="rounded-xl border border-white/10 bg-[#1b1f27] px-4 py-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por unidade, vendedor, código, descrição ou RIT..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#1b1f27] px-4 py-3 text-sm text-slate-100 outline-none"
          >
            <option value="Todos">Todos os status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={requestDateFilter}
            onChange={(event) => setRequestDateFilter(event.target.value as DateFilter)}
            className="rounded-xl border border-white/10 bg-[#1b1f27] px-4 py-3 text-sm text-slate-100 outline-none"
          >
            {dateFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-3">
            {(currentUser.role === "vendedor" || isAnalyst) && (
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="rounded-xl bg-[#d7a24a] px-4 py-3 text-sm font-bold text-[#10151d] transition hover:bg-[#e4b564]"
              >
                + Nova solicitação
              </button>
            )}
            <button
              type="button"
              onClick={exportXlsx}
              className="rounded-xl border border-[#d7a24a]/40 bg-[#10151d] px-4 py-3 text-sm font-bold text-[#f7d9a0] transition hover:border-[#d7a24a]"
            >
              Exportar Excel
            </button>
          </div>
        </section>

        {isAnalyst && (
          <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-[#1b1f27] p-1">
            <button
              type="button"
              onClick={() => {
                setActiveAnalystTab("solicitacoes");
                setShowUserForm(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeAnalystTab === "solicitacoes"
                  ? "bg-[#d7a24a] text-[#10151d]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Solicitações
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAnalystTab("usuarios");
                setShowForm(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeAnalystTab === "usuarios"
                  ? "bg-[#d7a24a] text-[#10151d]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Usuários
            </button>
          </div>
        )}

        {isAnalyst && activeAnalystTab === "usuarios" && (
          <section className="mb-6 rounded-2xl border border-[#d7a24a]/30 bg-[#171d28] p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Usuários cadastrados</h2>
              <button
                type="button"
                onClick={() => setShowUserForm((value) => !value)}
                className="rounded-xl bg-[#d7a24a] px-4 py-2.5 text-sm font-bold text-[#10151d] hover:bg-[#e5b96a]"
              >
                + Novo usuário
              </button>
            </div>

            {showUserForm && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Criar novo usuário</h3>
                  <button type="button" onClick={() => setShowUserForm(false)} className="text-sm text-slate-300 hover:text-white">
                    Fechar
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <input
                    value={newUserForm.name}
                    onChange={(event) => setNewUserForm({ ...newUserForm, name: event.target.value })}
                    placeholder="Nome completo"
                    className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                  />
                  <input
                    value={newUserForm.username}
                    onChange={(event) => setNewUserForm({ ...newUserForm, username: event.target.value })}
                    placeholder="Nome de usuário"
                    className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                  />
                  <input
                    value={newUserForm.email}
                    onChange={(event) => setNewUserForm({ ...newUserForm, email: event.target.value })}
                    placeholder="E-mail"
                    className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                  />
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(event) => setNewUserForm({ ...newUserForm, password: event.target.value })}
                    placeholder="Senha"
                    className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                  />
                  <select
                    value={newUserForm.role}
                    onChange={(event) => setNewUserForm({ ...newUserForm, role: event.target.value as Role })}
                    className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="analista">Analista</option>
                  </select>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateUser}
                    className="rounded-xl bg-[#d7a24a] px-5 py-2.5 text-sm font-bold text-[#10151d] hover:bg-[#e5b96a]"
                  >
                    Cadastrar usuário
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[#1d2430] text-slate-300">
                  <tr>
                    <th className="border-b border-white/10 px-4 py-3 font-semibold">Nome</th>
                    <th className="border-b border-white/10 px-4 py-3 font-semibold">Usuário</th>
                    <th className="border-b border-white/10 px-4 py-3 font-semibold">E-mail</th>
                    <th className="border-b border-white/10 px-4 py-3 font-semibold">Perfil</th>
                    <th className="border-b border-white/10 px-4 py-3 font-semibold">Status</th>
                    <th className="border-b border-white/10 px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;

                    return (
                      <tr key={user.id} className="border-b border-white/10 bg-[#151d2a] text-slate-200 hover:bg-[#1a2433]">
                        <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                        <td className="px-4 py-3">{user.username}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-[#d7a24a]/30 bg-[#d7a24a]/10 px-2.5 py-1 text-xs font-semibold text-[#f9d59a]">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.isPending
                                ? "border border-amber-400/30 bg-amber-500/10 text-amber-200"
                                : "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                            }`}
                          >
                            {user.isPending ? "Pendência de senha" : "Ativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {!isCurrentUser ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => resetUserPassword(user.id)}
                                className="rounded-lg border border-[#d7a24a]/40 bg-[#1a2433] px-2.5 py-1.5 text-[11px] font-bold text-[#f7d9a0] hover:border-[#d7a24a]"
                              >
                                Resetar senha
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteUser(user.id)}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-200 hover:bg-red-500/20"
                              >
                                Excluir
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Usuário atual</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showForm && (currentUser.role === "vendedor" || isAnalyst) && activeAnalystTab !== "usuarios" && (
          <section className="mb-6 rounded-2xl border border-[#d7a24a]/30 bg-[#171d28] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Registrar demanda</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-300 hover:text-white">
                Fechar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <input
                value={form.unidade}
                onChange={(event) => setForm({ ...form, unidade: event.target.value })}
                placeholder="Unidade"
                className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
              />
              {isAnalyst ? (
                <input
                  value={form.vendedor}
                  onChange={(event) => setForm({ ...form, vendedor: event.target.value })}
                  placeholder="Vendedor"
                  className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                />
              ) : (
                <input
                  value={currentUser.name}
                  readOnly
                  className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white opacity-80"
                />
              )}
              <input
                value={form.codigo}
                onChange={(event) => setForm({ ...form, codigo: event.target.value })}
                placeholder="Código"
                className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
              />
              <input
                value={form.descricao}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                placeholder="Descrição"
                className="md:col-span-2 xl:col-span-2 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
              />
              <input
                value={form.volume}
                onChange={(event) => setForm({ ...form, volume: event.target.value })}
                placeholder="Volume"
                type="number"
                className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
              />
              <select
                value={form.unidadeMedida}
                onChange={(event) => setForm({ ...form, unidadeMedida: event.target.value })}
                className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
              >
                <option value="KG">KG</option>
                <option value="PC">PC</option>
                <option value="M">M</option>
                <option value="TON">TON</option>
              </select>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-[#d7a24a] px-5 py-2.5 text-sm font-bold text-[#10151d] hover:bg-[#e5b96a]"
              >
                Salvar solicitação
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121821] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          {isAnalyst && selectedForDeletion.length > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#171d28] px-4 py-3">
              <span className="text-sm text-slate-200">
                {selectedForDeletion.length} solicitação(ões) selecionada(s)
              </span>
              <button
                type="button"
                onClick={deleteSelectedRequests}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20"
              >
                Excluir selecionadas
              </button>
            </div>
          )}

          <div className="max-h-[620px] overflow-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#1d2430] text-slate-300 sticky top-0 z-10">
                <tr>
                  {isAnalyst && (
                    <th className="border-b border-white/10 px-3 py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={filteredRequests.length > 0 && filteredRequests.every((item) => selectedForDeletion.includes(item.id))}
                        onChange={() => {
                          if (filteredRequests.every((item) => selectedForDeletion.includes(item.id))) {
                            setSelectedForDeletion((current) => current.filter((id) => !filteredRequests.some((item) => item.id === id)));
                            return;
                          }

                          setSelectedForDeletion((current) => [
                            ...new Set([...current, ...filteredRequests.map((item) => item.id)]),
                          ]);
                        }}
                        className="h-4 w-4 accent-[#d7a24a]"
                        aria-label="Selecionar todas as solicitações filtradas"
                      />
                    </th>
                  )}
                  {[
                    "Unidade",
                    "Vendedor",
                    "Código",
                    "Descrição",
                    "Volume",
                    "UDM",
                    "Status",
                    "Data",
                    "Previsão",
                    "RIT",
                    "Ações",
                  ].map((column) => (
                    <th key={column} className="border-b border-white/10 px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((item) => {
                  const draftItem = { ...item, ...draftChanges[item.id] };
                  const hasPendingChanges = !!draftChanges[item.id];

                  return (
                    <tr key={item.id} className="border-b border-white/10 bg-[#151d2a] text-slate-200 hover:bg-[#1a2433]">
                      {isAnalyst && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedForDeletion.includes(item.id)}
                            onChange={() => toggleRequestSelection(item.id)}
                            className="h-4 w-4 accent-[#d7a24a]"
                            aria-label={`Selecionar solicitação ${item.codigo}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-white">{item.unidade}</td>
                      <td className="px-4 py-3">
                        {item.vendedor}
                      </td>
                      <td className="px-4 py-3">
                        {isAnalyst ? (
                          <input
                            value={draftItem.codigo}
                            onChange={(event) => updateDraftField(item.id, "codigo", event.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5 text-sm text-white"
                          />
                        ) : (
                          item.codigo
                        )}
                      </td>
                      <td className="min-w-[260px] px-4 py-3">
                        {isAnalyst ? (
                          <input
                            value={draftItem.descricao}
                            onChange={(event) => updateDraftField(item.id, "descricao", event.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5 text-sm text-white"
                          />
                        ) : (
                          <span className="block max-w-[310px] truncate">{item.descricao}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAnalyst ? (
                          <input
                            type="number"
                            value={draftItem.volume}
                            onChange={(event) => updateDraftField(item.id, "volume", event.target.value)}
                            className="w-20 rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5 text-sm text-white"
                          />
                        ) : (
                          item.volume
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAnalyst ? (
                          <select
                            value={draftItem.unidadeMedida}
                            onChange={(event) => updateDraftField(item.id, "unidadeMedida", event.target.value)}
                            className="rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5 text-sm text-white"
                          >
                            <option value="KG">KG</option>
                            <option value="PC">PC</option>
                            <option value="M">M</option>
                            <option value="TON">TON</option>
                          </select>
                        ) : (
                          item.unidadeMedida
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[draftItem.status]}`}>
                          {draftItem.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(item.data)}</td>
                      <td className="px-4 py-3">
                        {isAnalyst ? (
                          <input
                            value={draftItem.previsao}
                            onChange={(event) => updateDraftField(item.id, "previsao", event.target.value)}
                            className="w-24 rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5 text-sm text-white"
                          />
                        ) : (
                          item.previsao
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAnalyst ? (
                          <input
                            value={draftItem.rit}
                            onChange={(event) => updateDraftField(item.id, "rit", event.target.value)}
                            className="w-28 rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5 text-sm text-white"
                          />
                        ) : (
                          item.rit
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAnalyst ? (
                          <div className="flex flex-col gap-2">
                            <select
                              value={draftItem.status}
                              onChange={(event) => handleStatusDraftChange(item.id, event.target.value as Status)}
                              className="rounded-lg border border-[#d7a24a]/30 bg-[#0f172a] px-2 py-1.5 text-xs text-white"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <div className="text-[11px] text-slate-400">{draftItem.observacao}</div>
                            <button
                              type="button"
                              onClick={() => deleteRequest(item.id)}
                              className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] font-bold text-red-200 hover:bg-red-500/20"
                            >
                              Excluir
                            </button>
                            {hasPendingChanges && (
                              <button
                                type="button"
                                onClick={() => saveRequestChanges(item.id)}
                                className="rounded-lg bg-[#d7a24a] px-2 py-1.5 text-[11px] font-bold text-[#10151d] hover:bg-[#e4b564]"
                              >
                                Salvar alterações
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-300">{item.observacao}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="flex min-h-40 items-center justify-center p-8 text-slate-400">
              Nenhuma solicitação encontrada com os filtros atuais.
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#121821] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">Logs de auditoria</h2>
            <div className="flex flex-wrap items-center gap-3">
              {isAnalyst && (
                <select
                  value={logsFilter}
                  onChange={(event) => setLogsFilter(event.target.value as "mine" | "all")}
                  className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
                >
                  <option value="mine">Meu log</option>
                  <option value="all">Todos</option>
                </select>
              )}
              <select
                value={logsDateFilter}
                onChange={(event) => setLogsDateFilter(event.target.value as DateFilter)}
                className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
              >
                {dateFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {visibleLogs
              .filter((log) => (logsFilter === "all" || log.userId === currentUser.id))
              .map((log) => (
                <div key={log.id} className="rounded-xl border border-white/10 bg-[#0f172a] p-3 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white">{log.userName}</span>
                      <span className="ml-2 text-xs uppercase tracking-[0.2em] text-[#d7a24a]">{log.role}</span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <div className="mt-2 font-medium text-slate-100">{log.action}</div>
                  <div className="text-slate-300">{log.details}</div>
                  {log.requestCode && <div className="mt-2 text-xs text-slate-400">Código: {log.requestCode}</div>}
                </div>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
