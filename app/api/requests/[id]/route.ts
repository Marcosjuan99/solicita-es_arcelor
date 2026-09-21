import { NextResponse } from "next/server";

import { requireSupabase } from "../../../../lib/supabase";

const fromRow = (row: Record<string, unknown>) => ({
  id: row.id,
  unidade: row.unidade,
  vendedor: row.vendedor,
  codigo: row.codigo,
  cotacao: row.cotacao ?? "",
  descricao: row.descricao,
  volume: Number(row.volume),
  unidadeMedida: row.unidade_medida,
  status: row.status,
  data: row.data,
  previsao: row.previsao,
  rit: row.rit,
  observacao: row.observacao,
});

const toRow = (body: Record<string, unknown>) => {
  const row: Record<string, unknown> = {};
  const fields: Record<string, string> = {
    unidade: "unidade",
    vendedor: "vendedor",
    codigo: "codigo",
    cotacao: "cotacao",
    descricao: "descricao",
    volume: "volume",
    unidadeMedida: "unidade_medida",
    status: "status",
    data: "data",
    previsao: "previsao",
    rit: "rit",
    observacao: "observacao",
  };

  Object.entries(fields).forEach(([input, column]) => {
    if (input in body)
      row[column] = input === "volume" ? Number(body[input]) : body[input];
  });
  row.updated_at = new Date().toISOString();
  return row;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { data, error } = await requireSupabase()
      .from("requests")
      .update(toRow(await request.json()))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ request: fromRow(data) });
  } catch (error) {
    console.error("Request update failed:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a solicitação." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { error } = await requireSupabase()
      .from("requests")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, removedId: id });
  } catch (error) {
    console.error("Request deletion failed:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a solicitação." },
      { status: 500 },
    );
  }
}
