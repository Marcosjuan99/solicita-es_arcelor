import { NextResponse } from "next/server";

import {
  ensureSupabaseAuthUser,
  requireSupabase,
} from "../../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const login = String(body?.login ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "").trim();
    if (!login || !password)
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 },
      );

    const client = requireSupabase();
    const { data: users, error } = await client
      .from("users")
      .select("*")
      .or(`email.ilike.${login},username.ilike.${login}`)
      .limit(1);
    if (error) throw error;
    const user = users?.[0];
    if (!user)
      return NextResponse.json(
        { error: "Usuário ou e-mail não encontrado." },
        { status: 404 },
      );
    if (user.is_pending || !user.password)
      return NextResponse.json(
        { error: "Este usuário precisa criar uma senha." },
        { status: 409 },
      );
    if (user.password !== password)
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });

    await ensureSupabaseAuthUser(user.email, password, {
      name: user.name,
      role: user.role,
      profileId: user.id,
    });

    const { password: _password, ...safeUser } = user;
    return NextResponse.json({
      user: { ...safeUser, isPending: user.is_pending },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Não foi possível entrar no sistema." },
      { status: 500 },
    );
  }
}
