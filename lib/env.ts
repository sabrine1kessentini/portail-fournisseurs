import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET doit faire au moins 16 caractères"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY est requis"),
  EMAIL_FROM: z.string().email("EMAIL_FROM doit être une adresse email valide"),
  SUPABASE_URL: z.string().url("SUPABASE_URL doit être une URL valide"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY est requis"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("documents"),
  APP_URL: z.string().url("APP_URL doit être une URL valide"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET doit faire au moins 16 caractères"),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Valide les variables d'environnement au premier accès plutôt qu'au chargement
 * du module : évite de faire planter des commandes qui n'en ont pas besoin
 * (ex: `next lint`) et donne un message clair pointant vers .env.example.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuration invalide. Vérifie ton fichier .env par rapport à .env.example :\n${details}`
    );
  }
  cached = parsed.data;
  return cached;
}
