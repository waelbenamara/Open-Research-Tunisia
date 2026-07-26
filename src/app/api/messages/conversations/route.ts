import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConversations } from "@/lib/conversations";

/** Live conversation list for the messages sidebar (polled by ConversationList). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const conversations = await getConversations(me.id);
  return NextResponse.json({ conversations });
}
