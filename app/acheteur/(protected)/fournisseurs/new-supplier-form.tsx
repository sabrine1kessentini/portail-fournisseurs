"use client";

import { useActionState } from "react";
import { createSupplierAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: FormState = {};

export function NewSupplierForm({ isFr }: { isFr: boolean }) {
  const [state, formAction, pending] = useActionState(createSupplierAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">{isFr ? "Nom" : "Name"}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="defaultCurrency">{isFr ? "Devise" : "Currency"}</Label>
        <Select name="defaultCurrency" defaultValue="EUR">
          <SelectTrigger id="defaultCurrency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="TND">TND</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {isFr ? "Créer" : "Create"}
      </Button>
    </form>
  );
}
