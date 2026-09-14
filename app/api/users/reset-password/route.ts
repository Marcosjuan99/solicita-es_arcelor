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

async function readUsers(): Promise<StoredUser[]> {
  try {
    await mkdir(dataDir, { recursive: true });
    const content = await readFile(usersFile, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "E-mail obrigatório." },
        { status: 400 },
      );
    }

    const users = await readUsers();
    const userIndex = users.findIndex(
      (user) => user.email.toLowerCase() === email,
    );
    if (userIndex < 0) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    users[userIndex] = { ...users[userIndex], password: "", isPending: true };
    await writeFile(usersFile, JSON.stringify(users, null, 2));

    return NextResponse.json({ ok: true, user: users[userIndex] });
  } catch (error) {
    console.error("Reset password failed:", error);
    return NextResponse.json(
      { error: "Não foi possível redefinir a senha." },
      { status: 500 },
    );
  }
}
