import { NextResponse } from "next/server";

import { requireSupabase } from "../../../lib/supabase";

const fromRow = (row: Record<string, unknown>) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  email: row.email,
  role: row.role,
  isPending: row.is_pending,
});

export async function GET() {
  try {
    const { data, error } = await requireSupabase()
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ users: (data ?? []).map(fromRow) });
  } catch (error) {
    console.error("User listing failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Não foi possível carregar os usuários: ${error.message}`
            : "Não foi possível carregar os usuários.",
      },
      { status: 500 },
    );
  }
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
    if (!name || !username || !email || !password)
      return NextResponse.json(
        { error: "Preencha nome, usuário, e-mail e senha." },
        { status: 400 },
      );

    const client = requireSupabase();
    const { data: existing } = await client
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.ilike.${username}`);
    if (existing?.length)
      return NextResponse.json(
        { error: "Usuário ou e-mail já cadastrado." },
        { status: 409 },
      );

    const { data, error } = await client
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        name,
        username,
        email,
        password,
        role,
        is_pending: false,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ user: fromRow(data) }, { status: 201 });
  } catch (error) {
    console.error("User creation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Não foi possível criar o usuário: ${error.message}`
            : "Não foi possível criar o usuário.",
      },
      { status: 500 },
    );
  }
}
