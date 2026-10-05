import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const returnToCreate = searchParams.get("next") === "/create" ||
    cookieStore.get("humor_auth_next")?.value === "create";
  cookieStore.delete("humor_auth_next");
  if (code) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      // Only allow the explicit creation destination, never arbitrary redirect URLs.
      if (returnToCreate) {
        return NextResponse.redirect(new URL("/create", origin));
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      const destination =
        profile?.first_name?.trim() && profile?.last_name?.trim()
          ? "/"
          : "/profile";
      return NextResponse.redirect(new URL(destination, origin));
    }
  }
  return NextResponse.redirect(new URL("/auth/error", origin));
}
