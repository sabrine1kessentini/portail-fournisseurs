// Constantes pures, sans dépendance Node/Prisma : c'est le seul module que
// middleware.ts (Edge Runtime) est autorisé à importer depuis lib/auth.
export const BUYER_COOKIE_NAME = "buyer_session";
export const SUPPLIER_COOKIE_NAME = "supplier_session";
