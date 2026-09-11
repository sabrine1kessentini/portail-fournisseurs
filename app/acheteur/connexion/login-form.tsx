"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { getDictionary } from "@/lib/i18n/dictionaries";

const initialState: LoginState = {};

export function LoginForm({ dict }: { dict: ReturnType<typeof getDictionary> }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{dict.auth.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? dict.common.loading : dict.auth.loginButton}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
