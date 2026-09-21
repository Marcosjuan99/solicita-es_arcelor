import { NextResponse } from "next/server";

import { requireSupabase } from "../../../../lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { error } = await requireSupabase()
      .from("users")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, removedId: id });
  } catch (error) {
    console.error("Delete user failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? `Não foi possível excluir o usuário: ${error.message}`
          : "Não foi possível excluir o usuário.",
      },
      { status: 500 },
    );
  }
}
