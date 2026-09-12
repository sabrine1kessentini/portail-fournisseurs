"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { cn } from "cn";

/**
 * Presentational drag-and-drop shell around the exact same file input the
 * form already submits — same id/name/required/accept — so
 * uploadDocumentAction's `formData.get("file")` behavior is unaffected.
 */
export function DocumentDropzone({
  id,
  name,
  accept,
  required,
  label,
}: {
  id: string;
  name: string;
  accept: string;
  required?: boolean;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && inputRef.current) {
          inputRef.current.files = e.dataTransfer.files;
          setFileName(file.name);
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-input hover:bg-accent/50"
      )}
    >
      {fileName ? <FileCheck2 className="size-5 text-success" /> : <UploadCloud className="size-5 text-muted-foreground" />}
      <p className="text-sm font-medium">{fileName ?? label}</p>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        required={required}
        accept={accept}
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}
