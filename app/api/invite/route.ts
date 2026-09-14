import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { sendInviteEmail } from "../../../lib/email";

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");
const invitesFile = path.join(dataDir, "invites.json");

type StoredUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: "analista" | "vendedor";
  isPending?: boolean;
};

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token obrigatório." }, { status: 400 });
  }

  const invites = await readJson<
    Array<{ token: string; userId: string; email: string; used: boolean }>
  >(invitesFile, []);
  const invite = invites.find((item) => item.token === token && !item.used);

  if (!invite) {
    return NextResponse.json(
      { error: "Convite inválido ou já utilizado." },
      { status: 404 },
    );
  }

  const users = await readJson<StoredUser[]>(usersFile, []);
  const user = users.find((item) => item.id === invite.userId);

  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado para este convite." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, user });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const role = body?.role === "analista" ? "analista" : "vendedor";

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nome e e-mail são obrigatórios." },
        { status: 400 },
      );
    }

    await mkdir(dataDir, { recursive: true });

    const users = await readJson<StoredUser[]>(usersFile, []);
    const alreadyExists = users.some(
      (user) =>
        user.email.toLowerCase() === email ||
        user.username.toLowerCase() === email.split("@")[0].toLowerCase(),
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Usuário ou e-mail já cadastrado." },
        { status: 409 },
      );
    }

    const user: StoredUser = {
      id: randomUUID(),
      name,
      username: email.split("@")[0].toLowerCase(),
      email,
      password: "",
      role,
      isPending: true,
    };

    const nextUsers = [...users, user];
    await writeFile(usersFile, JSON.stringify(nextUsers, null, 2));

    const token = randomUUID();
    const invites = await readJson<
      Array<{
        token: string;
        userId: string;
        email: string;
        createdAt: string;
        used: boolean;
      }>
    >(invitesFile, []);
    invites.push({
      token,
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
      used: false,
    });
    await writeFile(invitesFile, JSON.stringify(invites, null, 2));

    const inviteLink = `${process.env.APP_URL ?? "http://localhost:3000"}?invite=${token}`;
    const emailResult = await sendInviteEmail({
      name: user.name,
      email: user.email,
      link: inviteLink,
    });

    return NextResponse.json({
      ok: true,
      user,
      inviteLink,
      email: emailResult,
    });
  } catch (error) {
    console.error("Invite creation failed:", error);
    return NextResponse.json(
      { error: "Não foi possível criar o convite." },
      { status: 500 },
    );
  }
}
