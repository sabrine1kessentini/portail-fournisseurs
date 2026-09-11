import { Resend } from "resend";
import { getEnv } from "@/lib/env";
import { getDictionary, type AppLocale } from "@/lib/i18n/dictionaries";

let client: Resend | null = null;

function getResend() {
  if (!client) client = new Resend(getEnv().RESEND_API_KEY);
  return client;
}

function wrapHtml(bodyHtml: string) {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <div style="padding:24px 0;border-bottom:1px solid #e5e5e5;margin-bottom:24px">
      <strong style="font-size:18px">Portail Fournisseurs</strong>
    </div>
    ${bodyHtml}
    <div style="padding-top:32px;margin-top:32px;border-top:1px solid #e5e5e5;color:#888;font-size:12px">
      Cet email est envoyé automatiquement par le Portail Fournisseurs.
    </div>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  const env = getEnv();
  try {
    await getResend().emails.send({ from: env.EMAIL_FROM, to, subject, html: wrapHtml(html) });
  } catch (err) {
    // Ne fait jamais planter le flux appelant (création de commande, cron...)
    // pour une erreur d'envoi d'email : on logue et on continue.
    console.error(`[email] échec d'envoi à ${to}:`, err);
  }
}

export async function sendSupplierInvitation(params: {
  to: string;
  locale: AppLocale;
  orderReference: string;
  magicLinkUrl: string;
}) {
  const d = getDictionary(params.locale);
  const subject = d.emails.invitationSubject.replace("{reference}", params.orderReference);
  const html =
    params.locale === "fr"
      ? `<p>Bonjour,</p>
         <p>Une nouvelle commande <strong>${params.orderReference}</strong> vous a été adressée et nécessite votre confirmation.</p>
         <p><a href="${params.magicLinkUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Consulter la commande</a></p>
         <p>Ce lien est personnel et expire automatiquement.</p>`
      : `<p>Hello,</p>
         <p>A new order <strong>${params.orderReference}</strong> has been issued to you and requires your confirmation.</p>
         <p><a href="${params.magicLinkUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none">View order</a></p>
         <p>This link is personal and expires automatically.</p>`;
  await send(params.to, subject, html);
}

interface DigestItem {
  label: string;
  detail?: string;
}

/** Un seul email groupé par fournisseur, jamais un email par ligne/document. */
export async function sendGroupedReminder(params: {
  to: string;
  locale: AppLocale;
  items: DigestItem[];
  magicLinkUrl: string;
  urgent?: boolean;
}) {
  const d = getDictionary(params.locale);
  const subject = params.urgent
    ? d.emails.escalationSubject
    : d.emails.reminderSubject.replace("{count}", String(params.items.length));

  const listHtml = params.items
    .map(
      (item) =>
        `<li style="margin-bottom:8px"><strong>${item.label}</strong>${
          item.detail ? ` — ${item.detail}` : ""
        }</li>`
    )
    .join("");

  const html =
    params.locale === "fr"
      ? `<p>Bonjour,</p>
         <p>Voici un récapitulatif des actions en attente sur vos commandes :</p>
         <ul>${listHtml}</ul>
         <p><a href="${params.magicLinkUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Accéder au portail</a></p>`
      : `<p>Hello,</p>
         <p>Here is a summary of pending actions on your orders:</p>
         <ul>${listHtml}</ul>
         <p><a href="${params.magicLinkUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Open portal</a></p>`;

  await send(params.to, subject, html);
}

export async function sendBuyerNotification(params: {
  to: string;
  locale: AppLocale;
  subject: string;
  bodyHtml: string;
}) {
  await send(params.to, params.subject, params.bodyHtml);
}
