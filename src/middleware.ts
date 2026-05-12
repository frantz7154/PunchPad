import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth: middlewareAuth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/clock", "/calendar", "/reports", "/admin"];

export default middlewareAuth((req) => {
  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  if (!req.auth?.user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (req.auth.user.mustChangePassword && path !== "/account/change-password") {
    return NextResponse.redirect(new URL("/account/change-password", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
