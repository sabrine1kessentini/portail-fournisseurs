"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createBuyerSessionCookie } from "@/lib/auth/buyer";
import { loginSchema } from "@/lib/validations";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email ou mot de passe invalide." };
  }

  const buyer = await prisma.buyer.findUnique({ where: { email: parsed.data.email } });
  if (!buyer) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const valid = await verifyPassword(parsed.data.password, buyer.passwordHash);
  if (!valid) {
    return { error: "Email ou mot de passe incorrect." };
  }

  await createBuyerSessionCookie({
    buyerId: buyer.id,
    email: buyer.email,
    name: buyer.name,
    locale: buyer.locale,
  });

  redirect("/acheteur");
}
