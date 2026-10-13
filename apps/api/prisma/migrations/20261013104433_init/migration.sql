-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_categories" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_limit" DECIMAL(18,0) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_code_counters" (
    "category_id" UUID NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_code_counters_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "incoming_goods" (
    "id" UUID NOT NULL,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operator_id" UUID NOT NULL,
    "sub_category_id" UUID NOT NULL,
    "origin" VARCHAR(200) NOT NULL,
    "letter_number" VARCHAR(100),
    "unit" VARCHAR(100) NOT NULL DEFAULT 'Gudang Utama',
    "attachment_key" VARCHAR(255),
    "attachment_name" VARCHAR(255),
    "attachment_size" INTEGER,
    "attachment_mime" VARCHAR(100),
    "price_limit_snapshot" DECIMAL(18,0) NOT NULL,
    "total_amount" DECIMAL(18,0) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "incoming_goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_goods_items" (
    "id" UUID NOT NULL,
    "incoming_goods_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "unit_price" DECIMAL(18,0) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "uom" VARCHAR(40) NOT NULL,
    "line_total" DECIMAL(18,0) NOT NULL,
    "expired_date" DATE,

    CONSTRAINT "incoming_goods_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "sub_categories_category_id_idx" ON "sub_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_categories_category_id_name_key" ON "sub_categories"("category_id", "name");

-- CreateIndex
CREATE INDEX "incoming_goods_transaction_date_idx" ON "incoming_goods"("transaction_date" DESC);

-- CreateIndex
CREATE INDEX "incoming_goods_operator_id_transaction_date_idx" ON "incoming_goods"("operator_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "incoming_goods_sub_category_id_idx" ON "incoming_goods"("sub_category_id");

-- CreateIndex
CREATE INDEX "incoming_goods_is_verified_idx" ON "incoming_goods"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "incoming_goods_items_item_code_key" ON "incoming_goods_items"("item_code");

-- CreateIndex
CREATE INDEX "incoming_goods_items_incoming_goods_id_line_no_idx" ON "incoming_goods_items"("incoming_goods_id", "line_no");

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_code_counters" ADD CONSTRAINT "item_code_counters_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_goods" ADD CONSTRAINT "incoming_goods_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_goods" ADD CONSTRAINT "incoming_goods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_goods" ADD CONSTRAINT "incoming_goods_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_goods" ADD CONSTRAINT "incoming_goods_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "sub_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_goods_items" ADD CONSTRAINT "incoming_goods_items_incoming_goods_id_fkey" FOREIGN KEY ("incoming_goods_id") REFERENCES "incoming_goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense-in-depth CHECK constraints (DATABASE_SCHEMA §4)
ALTER TABLE "sub_categories"
  ADD CONSTRAINT "chk_sub_categories_price_limit" CHECK ("price_limit" >= 1);

ALTER TABLE "incoming_goods"
  ADD CONSTRAINT "chk_incoming_goods_total_nonneg" CHECK ("total_amount" >= 0),
  ADD CONSTRAINT "chk_incoming_goods_within_limit" CHECK ("total_amount" <= "price_limit_snapshot"); -- BR-13

ALTER TABLE "incoming_goods_items"
  ADD CONSTRAINT "chk_items_qty" CHECK ("quantity" >= 1),
  ADD CONSTRAINT "chk_items_price" CHECK ("unit_price" >= 1),
  ADD CONSTRAINT "chk_items_line_total" CHECK ("line_total" = "unit_price" * "quantity");
