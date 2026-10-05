import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  // A provider can fall back to Site URL. Exchange its code before rendering
  // the homepage, rather than letting browser auth race the server-rendered UI.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callback = new URL("/auth/callback", request.url);
    callback.searchParams.set("code", request.nextUrl.searchParams.get("code")!);
    if (request.nextUrl.searchParams.get("next") === "/create") {
      callback.searchParams.set("next", "/create");
    }
    const redirect = NextResponse.redirect(callback);
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/", "/create/:path*", "/profile/:path*", "/auth/:path*"] };
