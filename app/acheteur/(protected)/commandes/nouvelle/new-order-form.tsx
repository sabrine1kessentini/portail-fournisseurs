"use client";

import { useActionState, useState } from "react";
import { createOrderAction, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/dictionaries";

const initialState: FormState = {};

interface LineDraft {
  designation: string;
  quantity: string;
  unitPrice: string;
  requestedDate: string;
}

function emptyLine(): LineDraft {
  return { designation: "", quantity: "", unitPrice: "", requestedDate: "" };
}

export function NewOrderForm({
  suppliers,
  locale,
}: {
  suppliers: { id: string; name: string; defaultCurrency: string }[];
  locale: AppLocale;
}) {
  const isFr = locale === "fr";
  const [state, formAction, pending] = useActionState(createOrderAction, initialState);
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [currency, setCurrency] = useState("EUR");

  function updateLine(index: number, field: keyof LineDraft, value: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reference">{isFr ? "Référence" : "Reference"}</Label>
            <Input id="reference" name="reference" placeholder="PO-2026-005" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplierId">{isFr ? "Fournisseur" : "Supplier"}</Label>
            <Select
              name="supplierId"
              onValueChange={(value) => {
                const s = suppliers.find((sup) => sup.id === value);
                if (s) setCurrency(s.defaultCurrency);
              }}
            >
              <SelectTrigger id="supplierId" className="w-full">
                <SelectValue placeholder={isFr ? "Choisir…" : "Choose…"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{isFr ? "Devise" : "Currency"}</Label>
            <Select
              name="currency"
              value={currency}
              onValueChange={(value) => value && setCurrency(value)}
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{isFr ? "Lignes de commande" : "Order lines"}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="mr-1 size-4" />
            {isFr ? "Ajouter une ligne" : "Add line"}
          </Button>
        </div>

        {lines.map((line, i) => (
          <Card key={i}>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label className="text-xs">{isFr ? "Désignation" : "Designation"}</Label>
                <Input
                  name={`designation-${i}`}
                  value={line.designation}
                  onChange={(e) => updateLine(i, "designation", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isFr ? "Quantité" : "Quantity"}</Label>
                <Input
                  name={`quantity-${i}`}
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isFr ? "Prix unitaire" : "Unit price"}</Label>
                <Input
                  name={`unitPrice-${i}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isFr ? "Date demandée" : "Requested date"}</Label>
                <Input
                  name={`requestedDate-${i}`}
                  type="date"
                  value={line.requestedDate}
                  onChange={(e) => updateLine(i, "requestedDate", e.target.value)}
                  required
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end"
                disabled={lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <Button type="submit" disabled={pending}>
        {pending ? (isFr ? "Création…" : "Creating…") : isFr ? "Créer la commande" : "Create order"}
      </Button>
    </form>
  );
}
