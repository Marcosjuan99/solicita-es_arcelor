import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

const defaultUsers: StoredUser[] = [
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

const mergeProtectedUsers = (list: StoredUser[]): StoredUser[] => {
  const seen = new Set<string>();
  const merged: StoredUser[] = [];

  [...defaultUsers, ...list].forEach((user) => {
    const key = (user.email ?? "").toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(user);
  });

  return merged;
};

type StoredUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: "analista" | "vendedor";
  isPending?: boolean;
};

async function readUsers(): Promise<StoredUser[]> {
  try {
    await mkdir(dataDir, { recursive: true });
    const content = await readFile(usersFile, "utf8");
    const parsed = JSON.parse(content);
    const list = Array.isArray(parsed) ? parsed : [];
    return mergeProtectedUsers(list);
  } catch {
    return defaultUsers;
  }
}

export async function GET() {
  return NextResponse.json({ users: await readUsers() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const username = String(body?.username ?? "").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "").trim();
    const role = body?.role === "analista" ? "analista" : "vendedor";

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: "Preencha nome, usuário, e-mail e senha." },
        { status: 400 },
      );
    }

    const users = await readUsers();
    const alreadyExists = users.some(
      (user) =>
        user.email.toLowerCase() === email ||
        user.username.toLowerCase() === username.toLowerCase(),
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Usuário ou e-mail já cadastrado." },
        { status: 409 },
      );
    }

    const user: StoredUser = {
      id: crypto.randomUUID(),
      name,
      username,
      email,
      password,
      role,
      isPending: false,
    };

    await mkdir(dataDir, { recursive: true });
    await writeFile(usersFile, JSON.stringify([...users, user], null, 2));

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("User creation failed:", error);
    return NextResponse.json(
      { error: "Não foi possível criar o usuário." },
      { status: 500 },
    );
  }
}
