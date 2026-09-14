import { readFile } from "fs/promises";
import path from "path";

const dataFile = path.join(process.cwd(), "data", "invites.json");

export async function validateInvite(token: string) {
  try {
    const content = await readFile(dataFile, "utf8");
    const invites = JSON.parse(content);
    const tokenItem = Array.isArray(invites)
      ? invites.find((item: any) => item.token === token && !item.used)
      : null;

    return tokenItem ?? null;
  } catch {
    return null;
  }
}
