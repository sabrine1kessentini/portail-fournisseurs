"use client";

import { useActionState, useState } from "react";
import { confirmLineAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { getDictionary } from "@/lib/i18n/dictionaries";

const initialState: FormState = {};

type Mode = "accept" | "propose_date" | "dispute";

export function LineActionForm({
  lineId,
  maxQuantity,
  dict,
}: {
  lineId: string;
  maxQuantity: number;
  dict: ReturnType<typeof getDictionary>;
}) {
  const [state, formAction, pending] = useActionState(confirmLineAction, initialState);
  const [mode, setMode] = useState<Mode>("accept");

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{dict.supplierPortal.confirmationSaved}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-3 border-t pt-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" name="orderLineId" value={lineId} />
      <input type="hidden" name="action" value={mode} />

      <div className="inline-flex w-full gap-1 rounded-lg bg-muted p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "accept" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => setMode("accept")}
        >
          {dict.common.accept}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "propose_date" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => setMode("propose_date")}
        >
          {dict.supplierPortal.proposeNewDate}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "dispute" ? "destructive" : "ghost"}
          className="flex-1"
          onClick={() => setMode("dispute")}
        >
          {dict.lineStatus.disputed}
        </Button>
      </div>

      {mode === "accept" && (
        <div className="max-w-40 space-y-1.5">
          <Label htmlFor={`qty-${lineId}`} className="text-xs">
            {dict.supplierPortal.confirmedQuantity}
          </Label>
          <Input
            id={`qty-${lineId}`}
            name="confirmedQuantity"
            type="number"
            min={0}
            max={maxQuantity}
            defaultValue={maxQuantity}
          />
        </div>
      )}

      {mode === "propose_date" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`date-${lineId}`} className="text-xs">
              {dict.supplierPortal.proposedDate}
            </Label>
            <Input id={`date-${lineId}`} name="proposedDate" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${lineId}`} className="text-xs">
              {dict.supplierPortal.reason}
            </Label>
            <Textarea
              id={`reason-${lineId}`}
              name="reason"
              placeholder={dict.supplierPortal.reasonPlaceholder}
              required
            />
          </div>
        </div>
      )}

      {mode === "dispute" && (
        <div className="space-y-1.5">
          <Label htmlFor={`dispute-reason-${lineId}`} className="text-xs">
            {dict.supplierPortal.reason}
          </Label>
          <Textarea
            id={`dispute-reason-${lineId}`}
            name="reason"
            placeholder={dict.supplierPortal.reasonPlaceholder}
            required
          />
        </div>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? dict.common.loading : dict.supplierPortal.submitConfirmation}
      </Button>
    </form>
  );
}
