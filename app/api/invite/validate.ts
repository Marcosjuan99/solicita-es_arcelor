import { requireSupabase } from "../../../lib/supabase";

export async function validateInvite(token: string) {
  try {
    const { data } = await requireSupabase()
      .from("invites")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}
