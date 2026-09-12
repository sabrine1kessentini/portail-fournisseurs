"use client";

import { useActionState } from "react";
import { uploadDocumentAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentDropzone } from "@/components/supplier/document-dropzone";
import type { getDictionary } from "@/lib/i18n/dictionaries";

const initialState: FormState = {};

export function DocumentUploadForm({
  orderId,
  dict,
  replaceableDocs,
}: {
  orderId: string;
  dict: ReturnType<typeof getDictionary>;
  replaceableDocs: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertDescription>{dict.supplierPortal.documentUploaded}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-2">
        <Label htmlFor="type">{dict.supplierPortal.documentTypeLabel}</Label>
        <Select name="type" defaultValue="proforma_invoice">
          <SelectTrigger id="type" className="w-full">
            <SelectValue>
              {(value: keyof typeof dict.documentType | null) =>
                value ? dict.documentType[value] : dict.supplierPortal.documentTypeLabel
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="proforma_invoice">{dict.documentType.proforma_invoice}</SelectItem>
            <SelectItem value="certificate">{dict.documentType.certificate}</SelectItem>
            <SelectItem value="packing_list">{dict.documentType.packing_list}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiresAt">{dict.supplierPortal.expiryDate}</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>

      {replaceableDocs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="replacesId">{dict.supplierPortal.replaceDocument}</Label>
          <Select name="replacesId">
            <SelectTrigger id="replacesId" className="w-full">
              <SelectValue placeholder="—">
                {(value: string | null) =>
                  value ? (replaceableDocs.find((doc) => doc.id === value)?.label ?? value) : "—"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {replaceableDocs.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="file">{dict.supplierPortal.chooseFile}</Label>
        <DocumentDropzone
          id="file"
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg"
          label={dict.supplierPortal.chooseFile}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? dict.common.loading : dict.supplierPortal.uploadDocument}
      </Button>
    </form>
  );
}
