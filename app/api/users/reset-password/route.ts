import { NextResponse } from "next/server";

import { requireSupabase } from "../../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const email = String((await request.json())?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email)
      return NextResponse.json(
        { error: "E-mail obrigatório." },
        { status: 400 },
      );

    const { data, error } = await requireSupabase()
      .from("users")
      .update({ password: "", is_pending: true })
      .eq("email", email)
      .select()
      .single();
    if (error || !data)
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    return NextResponse.json({
      ok: true,
      user: { ...data, isPending: data.is_pending },
    });
  } catch (error) {
    console.error("Reset password failed:", error);
    return NextResponse.json(
      { error: "Não foi possível redefinir a senha." },
      { status: 500 },
    );
  }
}
