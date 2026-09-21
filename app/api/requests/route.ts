import { NextResponse } from "next/server";

import { requireSupabase } from "../../../lib/supabase";

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

export async function GET() {
  try {
    const { data, error } = await requireSupabase()
      .from("requests")
      .select("*")
      .order("data", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ requests: (data ?? []).map(fromRow) });
  } catch (error) {
    console.error("Request listing failed:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as solicitações." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = {
      id: String(body.id),
      unidade: String(body.unidade ?? "").trim(),
      vendedor: String(body.vendedor ?? "").trim(),
      codigo: String(body.codigo ?? "").trim(),
      cotacao: String(body.cotacao ?? "").trim(),
      descricao: String(body.descricao ?? "").trim(),
      volume: Number(body.volume),
      unidade_medida: String(body.unidadeMedida ?? "").trim(),
      status: String(body.status ?? "Nova solicitação"),
      data: body.data ?? new Date().toISOString(),
      previsao: String(body.previsao ?? "-"),
      rit: String(body.rit ?? "-"),
      observacao: String(body.observacao ?? ""),
      created_by: body.createdBy ? String(body.createdBy) : null,
    };

    if (
      !row.id ||
      !row.unidade ||
      !row.vendedor ||
      !row.codigo ||
      !row.descricao ||
      !row.unidade_medida ||
      !Number.isFinite(row.volume)
    ) {
      return NextResponse.json(
        { error: "Dados da solicitação inválidos." },
        { status: 400 },
      );
    }

    const { data, error } = await requireSupabase()
      .from("requests")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ request: fromRow(data) }, { status: 201 });
  } catch (error) {
    console.error("Request creation failed:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a solicitação." },
      { status: 500 },
    );
  }
}
