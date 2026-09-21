import { NextResponse } from "next/server";

import { requireSupabase } from "../../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "").trim();
    if (!email || !password)
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 },
      );

    const client = requireSupabase();
    const { data, error } = await client
      .from("users")
      .update({ password, is_pending: false })
      .eq("email", email)
      .select()
      .single();
    if (error || !data)
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    await client.from("invites").update({ used: true }).eq("user_id", data.id);
    return NextResponse.json({
      ok: true,
      user: { ...data, isPending: data.is_pending },
    });
  } catch (error) {
    console.error("Password set failed:", error);
    return NextResponse.json(
      { error: "Não foi possível definir a senha." },
      { status: 500 },
    );
  }
}
