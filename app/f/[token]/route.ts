import { NextRequest, NextResponse } from "next/server";
import { resolveMagicLinkAndCreateSession } from "@/lib/auth/supplier";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await resolveMagicLinkAndCreateSession(token);

  if (!result || result.status === "invalid") {
    return NextResponse.redirect(new URL("/fournisseur/lien-expire", request.url));
  }

  const destination = result.orderId
    ? `/fournisseur/commandes/${result.orderId}`
    : "/fournisseur";
  return NextResponse.redirect(new URL(destination, request.url));
}
