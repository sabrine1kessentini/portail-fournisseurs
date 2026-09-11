-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('fr', 'en');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'issued', 'cancelled', 'closed');

-- CreateEnum
CREATE TYPE "OrderLineStatus" AS ENUM ('pending', 'confirmed', 'date_proposed', 'partially_confirmed', 'disputed', 'cancelled');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('proforma_invoice', 'certificate', 'packing_list');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('valid', 'expiring_soon', 'expiring_urgent', 'expired', 'superseded');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('link_not_opened', 'date_change_pending', 'document_expiring_soon', 'document_expiring_urgent', 'document_expired');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('buyer', 'supplier', 'system');

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'EUR',
    "locale" "Locale" NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "status" "OrderStatus" NOT NULL DEFAULT 'issued',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "confirmedQuantity" INTEGER,
    "proposedDate" TIMESTAMP(3),
    "reason" TEXT,
    "status" "OrderLineStatus" NOT NULL DEFAULT 'pending',
    "receptionBlocked" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_history" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "changedByType" "ActorType" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'pending',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "order_line_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_access_logs" (
    "id" TEXT NOT NULL,
    "magicLinkId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "magicLinkId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'valid',
    "expiresAt" TIMESTAMP(3),
    "replacesId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_digests" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "payload" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_digests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buyers_email_key" ON "buyers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_email_key" ON "suppliers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_tokenHash_key" ON "magic_links"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_sessions_tokenHash_key" ON "supplier_sessions"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "documents_replacesId_key" ON "documents"("replacesId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_history" ADD CONSTRAINT "order_line_history_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_history" ADD CONSTRAINT "order_line_history_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_access_logs" ADD CONSTRAINT "order_access_logs_magicLinkId_fkey" FOREIGN KEY ("magicLinkId") REFERENCES "magic_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_sessions" ADD CONSTRAINT "supplier_sessions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_sessions" ADD CONSTRAINT "supplier_sessions_magicLinkId_fkey" FOREIGN KEY ("magicLinkId") REFERENCES "magic_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_digests" ADD CONSTRAINT "alert_digests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
