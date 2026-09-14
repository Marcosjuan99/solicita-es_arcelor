import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

type StoredUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: "analista" | "vendedor";
  isPending?: boolean;
};

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

async function readUsers(): Promise<StoredUser[]> {
  try {
    await mkdir(dataDir, { recursive: true });
    const content = await readFile(usersFile, "utf8");
    const parsed = JSON.parse(content);
    const list = Array.isArray(parsed) ? parsed : [];
    const seen = new Set<string>();
    const merged: StoredUser[] = [];

    [...defaultUsers, ...list].forEach((user) => {
      const key = (user.email ?? "").toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(user);
    });

    return merged;
  } catch {
    return defaultUsers;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const users = await readUsers();
    const filtered = users.filter((user) => user.id !== id);

    await writeFile(usersFile, JSON.stringify(filtered, null, 2));

    return NextResponse.json({ ok: true, removedId: id });
  } catch (error) {
    console.error("Delete user failed:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o usuário." },
      { status: 500 },
    );
  }
}
