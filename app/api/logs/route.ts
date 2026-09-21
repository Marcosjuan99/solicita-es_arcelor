import { NextResponse } from "next/server";

import { requireSupabase } from "../../../lib/supabase";

const toRow = (log: Record<string, unknown>) => ({
  id: log.id,
  timestamp: log.timestamp,
  user_id: log.userId,
  user_name: log.userName,
  role: log.role,
  action: log.action,
  details: log.details,
  request_data: log.requestData ?? null,
  request_owner: log.requestOwner ?? null,
  request_id: log.requestId ?? null,
  request_code: log.requestCode ?? null,
});

const fromRow = (row: Record<string, unknown>) => ({
  id: row.id,
  timestamp: row.timestamp,
  userId: row.user_id,
  userName: row.user_name,
  role: row.role,
  action: row.action,
  details: row.details,
  requestData: row.request_data,
  requestOwner: row.request_owner,
  requestId: row.request_id,
  requestCode: row.request_code,
});

export async function GET() {
  try {
    const { data, error } = await requireSupabase()
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ logs: (data ?? []).map(fromRow) });
  } catch (error) {
    console.error("Log listing failed:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os logs." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { data, error } = await requireSupabase()
      .from("audit_logs")
      .insert(toRow(await request.json()))
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ log: fromRow(data) }, { status: 201 });
  } catch (error) {
    console.error("Log creation failed:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar o log." },
      { status: 500 },
    );
  }
}
