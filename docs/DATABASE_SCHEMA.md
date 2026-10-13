# DATABASE_SCHEMA.md

PostgreSQL + Prisma. File sumber: `apps/api/prisma/schema.prisma`. Dokumen ini menjelaskan **mengapa** dan memuat SQL tambahan yang tidak dapat diekspresikan Prisma.

> Catatan versi: sintaks `datasource` Prisma berbeda antar mayor (mis. konfigurasi URL pindah ke `prisma.config.ts` pada versi baru). Sesuaikan dengan versi yang di-pin; model & aturan di bawah tetap berlaku.

---

## 1. Konvensi

| Topik | Aturan |
|---|---|
| Nama tabel/kolom | `snake_case`, tabel jamak (via `@@map` / `@map`) |
| PK | `uuid` (`@db.Uuid`, `gen_random_uuid()`) |
| Waktu | `timestamptz(6)`, simpan UTC. `date` hanya untuk `expired_date` |
| Uang | `NUMERIC(18,0)` = integer Rupiah (BR-24). Prisma `Decimal` → konversi ke `number` di mapper (nilai < 2^53) |
| Normalisasi | `users.username`, `users.email` disimpan **lowercase**; `categories.code` **UPPERCASE** (AS-13) → cukup `@unique` biasa |
| FK | `ON DELETE RESTRICT` untuk relasi master/user (BR-07/08/09); `CASCADE` hanya items → header |
| Audit | `created_at`, `updated_at`; transaksi memiliki `created_by_id` |
| Delete | Hard delete (dengan guard RESTRICT). Tidak ada soft delete pada skala ini |

---

## 2. ERD

```mermaid
erDiagram
  USERS ||--o{ INCOMING_GOODS : "operator_id"
  USERS ||--o{ INCOMING_GOODS : "created_by_id"
  USERS ||--o{ INCOMING_GOODS : "verified_by_id"
  CATEGORIES ||--o{ SUB_CATEGORIES : has
  CATEGORIES ||--|| ITEM_CODE_COUNTERS : "counter"
  SUB_CATEGORIES ||--o{ INCOMING_GOODS : classifies
  INCOMING_GOODS ||--|{ INCOMING_GOODS_ITEMS : contains

  USERS { uuid id PK; varchar username UK; varchar email UK; enum role; bool is_locked }
  CATEGORIES { uuid id PK; varchar code UK; varchar name }
  SUB_CATEGORIES { uuid id PK; uuid category_id FK; varchar name; numeric price_limit }
  INCOMING_GOODS { uuid id PK; uuid operator_id FK; uuid sub_category_id FK; timestamptz transaction_date; varchar origin; numeric total_amount; numeric price_limit_snapshot; bool is_verified }
  INCOMING_GOODS_ITEMS { uuid id PK; uuid incoming_goods_id FK; varchar item_code UK; varchar name; numeric unit_price; int quantity; numeric line_total }
  ITEM_CODE_COUNTERS { uuid category_id PK; int last_value }
```

Kategori pada transaksi **diturunkan** dari `sub_category.category_id` (tidak disimpan ganda → tak mungkin tidak konsisten, BR-11).

---

## 3. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL") // pooled (Supabase pooler, ?pgbouncer=true) untuk runtime
  directUrl = env("DIRECT_URL")   // koneksi langsung untuk migrate
}

enum Role {
  ADMIN
  OPERATOR
}

model User {
  id           String    @id @default(uuid()) @db.Uuid
  username     String    @unique @db.VarChar(100) // lowercase
  passwordHash String    @map("password_hash") @db.VarChar(255)
  name         String    @db.VarChar(100)
  email        String    @unique @db.VarChar(100) // lowercase
  role         Role
  isLocked     Boolean   @default(false) @map("is_locked")
  lockedAt     DateTime? @map("locked_at") @db.Timestamptz(6)
  lastLoginAt  DateTime? @map("last_login_at") @db.Timestamptz(6)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  asOperator IncomingGoods[] @relation("IncomingOperator")
  createdBy  IncomingGoods[] @relation("IncomingCreatedBy")
  verifiedBy IncomingGoods[] @relation("IncomingVerifiedBy")

  @@index([role])
  @@map("users")
}

model Category {
  id        String   @id @default(uuid()) @db.Uuid
  code      String   @unique @db.VarChar(10) // UPPERCASE
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  subCategories SubCategory[]
  counter       ItemCodeCounter?

  @@map("categories")
}

model SubCategory {
  id         String   @id @default(uuid()) @db.Uuid
  categoryId String   @map("category_id") @db.Uuid
  name       String   @db.VarChar(100)
  priceLimit Decimal  @map("price_limit") @db.Decimal(18, 0)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  category      Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  incomingGoods IncomingGoods[]

  @@unique([categoryId, name])
  @@index([categoryId])
  @@map("sub_categories")
}

model ItemCodeCounter {
  categoryId String   @id @map("category_id") @db.Uuid
  lastValue  Int      @default(0) @map("last_value")
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@map("item_code_counters")
}

model IncomingGoods {
  id                  String    @id @default(uuid()) @db.Uuid
  transactionDate     DateTime  @default(now()) @map("transaction_date") @db.Timestamptz(6)
  operatorId          String    @map("operator_id") @db.Uuid
  subCategoryId       String    @map("sub_category_id") @db.Uuid
  origin              String    @db.VarChar(200)
  letterNumber        String?   @map("letter_number") @db.VarChar(100)
  unit                String    @default("Gudang Utama") @db.VarChar(100)

  attachmentKey       String?   @map("attachment_key") @db.VarChar(255)
  attachmentName      String?   @map("attachment_name") @db.VarChar(255)
  attachmentSize      Int?      @map("attachment_size")
  attachmentMime      String?   @map("attachment_mime") @db.VarChar(100)

  priceLimitSnapshot  Decimal   @map("price_limit_snapshot") @db.Decimal(18, 0)
  totalAmount         Decimal   @map("total_amount") @db.Decimal(18, 0)

  isVerified          Boolean   @default(false) @map("is_verified")
  verifiedAt          DateTime? @map("verified_at") @db.Timestamptz(6)
  verifiedById        String?   @map("verified_by_id") @db.Uuid

  createdById         String    @map("created_by_id") @db.Uuid
  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  operator     User        @relation("IncomingOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  createdBy    User        @relation("IncomingCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  verifiedBy   User?       @relation("IncomingVerifiedBy", fields: [verifiedById], references: [id], onDelete: SetNull)
  subCategory  SubCategory @relation(fields: [subCategoryId], references: [id], onDelete: Restrict)
  items        IncomingGoodsItem[]

  @@index([transactionDate(sort: Desc)])
  @@index([operatorId, transactionDate(sort: Desc)])
  @@index([subCategoryId])
  @@index([isVerified])
  @@map("incoming_goods")
}

model IncomingGoodsItem {
  id              String   @id @default(uuid()) @db.Uuid
  incomingGoodsId String   @map("incoming_goods_id") @db.Uuid
  lineNo          Int      @map("line_no")
  itemCode        String   @unique @map("item_code") @db.VarChar(20)
  name            String   @db.VarChar(200)
  unitPrice       Decimal  @map("unit_price") @db.Decimal(18, 0)
  quantity        Int
  uom             String   @db.VarChar(40) // "Satuan"
  lineTotal       Decimal  @map("line_total") @db.Decimal(18, 0)
  expiredDate     DateTime? @map("expired_date") @db.Date

  incomingGoods IncomingGoods @relation(fields: [incomingGoodsId], references: [id], onDelete: Cascade)

  @@index([incomingGoodsId, lineNo])
  @@map("incoming_goods_items")
}
```

> `onDelete: SetNull` pada `verifiedBy` hanya jaring pengaman; user yang punya transaksi (operator/created_by) tidak bisa dihapus (RESTRICT).

---

## 4. SQL tambahan (edit file migrasi hasil `prisma migrate dev --create-only`)

Prisma tidak mendukung `CHECK`. Tambahkan sebagai *defense-in-depth* di migrasi pertama:

```sql
ALTER TABLE sub_categories
  ADD CONSTRAINT chk_sub_categories_price_limit CHECK (price_limit >= 1);

ALTER TABLE incoming_goods
  ADD CONSTRAINT chk_incoming_goods_total_nonneg CHECK (total_amount >= 0),
  ADD CONSTRAINT chk_incoming_goods_within_limit CHECK (total_amount <= price_limit_snapshot); -- BR-13

ALTER TABLE incoming_goods_items
  ADD CONSTRAINT chk_items_qty CHECK (quantity >= 1),
  ADD CONSTRAINT chk_items_price CHECK (unit_price >= 1),
  ADD CONSTRAINT chk_items_line_total CHECK (line_total = unit_price * quantity);
```

Opsional (bila data besar): `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + `CREATE INDEX ... USING gin (origin gin_trgm_ops);` untuk search `ILIKE '%x%'`.

> Jangan edit migrasi yang sudah ter-commit; perubahan = migrasi baru.

---

## 5. Index & alasan

| Index | Dipakai oleh |
|---|---|
| `incoming_goods(transaction_date DESC)` | Default sort + filter tahun (range) |
| `incoming_goods(operator_id, transaction_date DESC)` | Scope Operator (BR-18) |
| `incoming_goods(sub_category_id)` | Filter kategori/sub kategori, cek pemakaian sub (BR-08) |
| `incoming_goods_items(incoming_goods_id, line_no)` | Load item per transaksi berurutan |
| `incoming_goods_items(item_code)` UNIQUE | BR-21 |
| `sub_categories(category_id)`, unik `(category_id,name)` | Opsi berantai, cegah duplikat |
| `users(role)` | Filter Role, opsi Operator |

---

## 6. Pola query kunci

**Rentang tahun (WIB)** — jangan pakai `EXTRACT(YEAR ...)` pada kolom ter-index:
```ts
const start = new Date(`${year}-01-01T00:00:00+07:00`);
const end   = new Date(`${year + 1}-01-01T00:00:00+07:00`);
where.transactionDate = { gte: start, lt: end };
```

**Daftar tahun tersedia** (`GET /incoming-goods/years`, ikut scope user):
```sql
SELECT DISTINCT EXTRACT(YEAR FROM transaction_date AT TIME ZONE 'Asia/Jakarta')::int AS year
FROM incoming_goods /* + WHERE operator_id = $1 untuk Operator */
ORDER BY year DESC;
```

**List Barang Masuk** (satu query + `include`, tanpa N+1):
```ts
prisma.incomingGoods.findMany({
  where: { AND: [scopeByUser(user), filters, searchOr] },
  orderBy: buildOrderBy(sortBy, sortOrder), // transactionDate | origin | totalAmount (+ id sebagai tie-breaker)
  skip: (page - 1) * 10, take: 10,
  select: { /* header */, operator: { select: { id: true, name: true } },
            subCategory: { select: { id: true, name: true, priceLimit: true,
                                     category: { select: { id: true, code: true, name: true } } } },
            items: { orderBy: { lineNo: 'asc' } } },
});
```
`searchOr` = `[{origin:{contains:q,mode:'insensitive'}}, {subCategory:{name:{contains:q,mode:'insensitive'}}}]`. Selalu sertakan `id` sebagai tie-breaker agar paging stabil.

**Kode barang atomik (BR-21)** — di dalam `$transaction` yang sama dengan insert:
```sql
INSERT INTO item_code_counters (category_id, last_value)
VALUES ($1, $2)                                 -- $2 = jumlah item baru
ON CONFLICT (category_id)
DO UPDATE SET last_value = item_code_counters.last_value + EXCLUDED.last_value
RETURNING last_value;                           -- awal = last_value - n + 1
```
Kode = `${category.code}${String(n).padStart(4,'0')}` → mis. `PK0001`. Baris counter terkunci selama transaksi sehingga aman dari race condition.

**Sinkronisasi item saat edit (BR-15)**: ambil id item lama → `delete` yang tidak ada di payload → `update` yang ada → `create` yang baru (kode baru) → hitung ulang `totalAmount` & `priceLimitSnapshot` → simpan; semua dalam satu `$transaction`.

**Validasi total (BR-13)** di service, sebelum commit:
```ts
const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0); // integer
if (total > Number(sub.priceLimit))
  throw new UnprocessableEntityException({ code: 'PRICE_LIMIT_EXCEEDED',
    details: { limit, total, excess: total - limit } });
```
(Gunakan `Decimal`/BigInt bila `MAX_MONEY` dinaikkan melewati 2^53.)

---

## 7. Seed (`prisma/seed.ts`, idempoten via `upsert`)

Seluruh data seed **mematuhi** aturan validasi (AS-09).

| Entitas | Data |
|---|---|
| Admin | username `administrator`, nama `Administrator JMC`, email `admin@jmc-indonesia.test`, pass `Admin12345` |
| Operator | `operator1` / "Budi Santoso" / `budi.santoso@jmc-indonesia.test`; `operator2` / "Liana Putri" / `liana.putri@jmc-indonesia.test` — pass `Operator12345` |
| User locked | `operator3` / "Joko Suyanto" (terkunci) untuk demo |
| Kategori | `PK` Perlengkapan Kantor; `FO` Makanan |
| Sub Kategori | PK: Alat Tulis (500.000), Perabotan (7.500.000); FO: Makanan Ringan (1.000.000) |
| Barang Masuk | ≥ 25 transaksi tersebar 2025–2026, campuran operator & status verifikasi, total selalu ≤ batas |

> Password seed hanya untuk demo/penilaian dan **dicantumkan di README** sesuai ketentuan test. Ambil dari env (`SEED_*`) agar tidak hardcode di repo bila memungkinkan.

---

## 8. Kebijakan migrasi

- Lokal: `prisma migrate dev`. Produksi: `prisma migrate deploy` (otomatis pada start command Render — lihat SETUP).
- Migrasi harus *forward-only* dan dapat dijalankan dari DB kosong → seed.
- Setiap perubahan skema: update dokumen ini + `API_SPEC.md` bila memengaruhi kontrak.
