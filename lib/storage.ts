import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let client: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!client) {
    const env = getEnv();
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}

/**
 * Dépose un document fournisseur dans Supabase Storage et retourne son URL
 * publique. Le bucket est privé par défaut côté Supabase ; on utilise donc
 * des URLs signées à durée limitée plutôt qu'un accès public direct.
 */
export async function uploadDocument(params: {
  orderId: string;
  supplierId: string;
  file: File;
}): Promise<{ path: string; fileName: string }> {
  const env = getEnv();
  const supabase = getSupabase();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${params.supplierId}/${params.orderId}/${Date.now()}-${safeName}`;

  const arrayBuffer = await params.file.arrayBuffer();
  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: params.file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(`Échec de l'upload du document : ${error.message}`);
  }

  return { path, fileName: params.file.name };
}

/**
 * `download: fileName` force l'en-tête Content-Disposition: attachment côté
 * Supabase — sans ça, le navigateur affiche le fichier inline (image, PDF)
 * au lieu de proposer un vrai téléchargement.
 */
export async function getSignedDocumentUrl(path: string, fileName: string, expiresInSeconds = 3600) {
  const env = getEnv();
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds, { download: fileName });

  if (error || !data) {
    throw new Error(`Impossible de générer le lien du document : ${error?.message}`);
  }
  return data.signedUrl;
}
