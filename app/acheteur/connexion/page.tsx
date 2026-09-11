import { LoginForm } from "./login-form";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
          {d.common.appName}
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">{d.auth.loginTitle}</p>
        <LoginForm dict={d} />
      </div>
    </main>
  );
}
