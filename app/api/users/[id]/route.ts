import { NextResponse } from "next/server";

import { requireSupabase } from "../../../../lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const client = requireSupabase();
    const { data: target, error: lookupError } = await client
      .from("users")
      .select("username, email")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!target) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    const isMaster =
      target.username.trim().toLowerCase() === "master" ||
      target.email.trim().toLowerCase() === "master@arcelormittal.com";
    if (isMaster) {
      return NextResponse.json(
        { error: "A exclusão do Master foi bloqueada pelo administrador." },
        { status: 403 },
      );
    }

    const { error } = await client.from("users").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, removedId: id });
  } catch (error) {
    console.error("Delete user failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Não foi possível excluir o usuário: ${error.message}`
            : "Não foi possível excluir o usuário.",
      },
      { status: 500 },
    );
  }
}
