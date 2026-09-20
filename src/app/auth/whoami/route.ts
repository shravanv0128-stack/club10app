import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const profileQuery = user
    ? await supabase.from("profiles").select("*").eq("id", user.id)
    : null;

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20),
    user: user ? { id: user.id, email: user.email } : null,
    userError,
    profiles: profileQuery?.data ?? null,
    profileError: profileQuery?.error ?? null,
  });
}
