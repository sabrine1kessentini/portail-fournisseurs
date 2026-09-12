import { NextRequest, NextResponse } from "next/server";
import { resolveMagicLinkAndCreateSession } from "@/lib/auth/supplier";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await resolveMagicLinkAndCreateSession(token);

  if (!result || result.status === "invalid") {
    const url = new URL("/fournisseur/lien-expire", request.url);
    if (result?.reason === "forwarded") url.searchParams.set("reason", "forwarded");
    return NextResponse.redirect(url);
  }

  const destination = result.orderId
    ? `/fournisseur/commandes/${result.orderId}`
    : "/fournisseur";
  return NextResponse.redirect(new URL(destination, request.url));
}
