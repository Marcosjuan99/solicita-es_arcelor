import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { sendInviteEmail } from "../../../lib/email";
import { requireSupabase } from "../../../lib/supabase";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token)
      return NextResponse.json(
        { error: "Token obrigatório." },
        { status: 400 },
      );

    const client = requireSupabase();
    const { data: invite } = await client
      .from("invites")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();
    if (!invite)
      return NextResponse.json(
        { error: "Convite inválido ou já utilizado." },
        { status: 404 },
      );
    const { data: user } = await client
      .from("users")
      .select("*")
      .eq("id", invite.user_id)
      .single();
    if (!user)
      return NextResponse.json(
        { error: "Usuário não encontrado para este convite." },
        { status: 404 },
      );
    return NextResponse.json({
      ok: true,
      user: { ...user, isPending: user.is_pending },
    });
  } catch (error) {
    console.error("Invite validation failed:", error);
    return NextResponse.json(
      { error: "Não foi possível validar o convite." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const role = body?.role === "analista" ? "analista" : "vendedor";
    if (!name || !email)
      return NextResponse.json(
        { error: "Nome e e-mail são obrigatórios." },
        { status: 400 },
      );

    const client = requireSupabase();
    const username = email.split("@")[0].toLowerCase();
    const { data: existing } = await client
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.eq.${username}`);
    if (existing?.length)
      return NextResponse.json(
        { error: "Usuário ou e-mail já cadastrado." },
        { status: 409 },
      );

    const userId = randomUUID();
    const token = randomUUID();
    const { data: user, error: userError } = await client
      .from("users")
      .insert({
        id: userId,
        name,
        username,
        email,
        password: "",
        role,
        is_pending: true,
      })
      .select()
      .single();
    if (userError) throw userError;
    const { error: inviteError } = await client
      .from("invites")
      .insert({ token, user_id: userId, email, used: false });
    if (inviteError) throw inviteError;

    const inviteLink = `${process.env.APP_URL ?? "http://localhost:3000"}?invite=${token}`;
    const emailResult = await sendInviteEmail({
      name,
      email,
      link: inviteLink,
    });
    return NextResponse.json({
      ok: true,
      user: { ...user, isPending: user.is_pending },
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
