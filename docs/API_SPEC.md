# API_SPEC.md

REST JSON. Base path: `/api/v1`. Swagger UI (dev & prod): `/api/docs`.
Status: **kontrak mengikat** — kode harus mengikuti; ubah dokumen bersamaan dengan kode.

---

## 1. Konvensi

| Topik | Aturan |
|---|---|
| Format | `application/json; charset=utf-8` (kecuali upload/download) |
| Field | `camelCase`. Uang = **integer Rupiah** (number). Tanggal-waktu = ISO-8601 UTC (`2026-10-04T03:00:00.000Z`). Tanggal = `YYYY-MM-DD` |
| ID | UUID string |
| Sukses | `{ "data": ... , "meta"?: ... }` |
| Hapus / aksi tanpa body | `204 No Content` |
| Paging | `?page=1&pageSize=10` (default 10, maks 50). `meta: { page, pageSize, totalItems, totalPages }` |
| Search | `?search=` (trim, contains, case-insensitive) |
| Sort | `?sortBy=<field>&sortOrder=asc|desc` |
| Versi | Prefix URL `/v1` |
| Request ID | Header respons `X-Request-Id` |

### 1.1 Autentikasi
- Login menetapkan cookie `jmc_session` (`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`). JWT berisi `sub`, `role`, `iat`, `exp` (8 jam).
- Server juga menerima `Authorization: Bearer <jwt>` (Swagger/test).
- **Tiap request** memuat user dari DB: ditolak bila user tidak ada / `isLocked` (BR-02).
- Mutasi (`POST/PUT/PATCH/DELETE`) memeriksa header `Origin` ∈ allowlist (`CORS_ORIGINS`) bila cookie dipakai.

### 1.2 Peran
`ADMIN`, `OPERATOR`. Kolom **Akses** di bawah: `A` = Admin, `O` = Operator, `*` = keduanya.

---

## 2. Rekap Endpoint

| Method | Path | Akses | Deskripsi |
|---|---|:-:|---|
| GET | `/health` | publik | Liveness + cek DB |
| POST | `/auth/login` | publik | Login |
| POST | `/auth/logout` | * | Logout (hapus cookie) |
| GET | `/auth/me` | * | Profil sesi |
| GET | `/categories` | A | Daftar (paging, search) |
| GET | `/categories/options` | * | Semua kategori untuk dropdown |
| POST | `/categories` | A | Tambah |
| GET | `/categories/:id` | A | Detail |
| PUT | `/categories/:id` | A | Ubah |
| DELETE | `/categories/:id` | A | Hapus |
| GET | `/sub-categories` | A | Daftar (paging, search, `categoryId`) |
| GET | `/sub-categories/options?categoryId=` | * | Dropdown berantai (+ `priceLimit`) |
| POST | `/sub-categories` | A | Tambah |
| GET | `/sub-categories/:id` | A | Detail |
| PUT | `/sub-categories/:id` | A | Ubah |
| DELETE | `/sub-categories/:id` | A | Hapus |
| GET | `/users` | A | Daftar (paging, `role`, search) |
| GET | `/users/options?role=OPERATOR` | A | Dropdown Operator di form Barang Masuk |
| POST | `/users` | A | Tambah |
| GET | `/users/:id` | A | Detail |
| PUT | `/users/:id` | A | Ubah |
| PATCH | `/users/:id/lock` | A | Lock/Unlock |
| DELETE | `/users/:id` | A | Hapus |
| GET | `/incoming-goods` | * | Daftar (scope by role) |
| GET | `/incoming-goods/years` | * | Tahun tersedia (untuk filter) |
| GET | `/incoming-goods/export` | * | Excel sesuai filter |
| POST | `/incoming-goods` | * | Tambah |
| GET | `/incoming-goods/:id` | * | Detail (untuk form edit) |
| PUT | `/incoming-goods/:id` | * | Ubah |
| DELETE | `/incoming-goods/:id` | * | Hapus |
| PATCH | `/incoming-goods/:id/verification` | A | Toggle verifikasi |
| GET | `/incoming-goods/:id/print` | * | PDF Surat Barang Masuk |
| POST | `/incoming-goods/:id/attachment` | * | Upload lampiran (multipart) |
| GET | `/incoming-goods/:id/attachment` | * | Signed URL unduh |
| DELETE | `/incoming-goods/:id/attachment` | * | Hapus lampiran |

> Urutan routing: definisikan `/incoming-goods/years` & `/export` **sebelum** `/:id`.
> `*` pada `/incoming-goods/*` tetap dibatasi scope Operator (BR-18).

---

## 3. Format Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": [ { "field": "items.0.unitPrice", "message": "Harga wajib diisi" } ],
    "requestId": "b3c1..."
  }
}
```

| HTTP | `code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Skema Zod gagal (`details[]` per field) |
| 400 | `FILE_INVALID` | Ekstensi/MIME/magic bytes/ukuran lampiran salah |
| 401 | `UNAUTHORIZED` | Tidak ada/!valid token, user tidak ada |
| 401 | `INVALID_CREDENTIALS` | Username/password salah |
| 403 | `ACCOUNT_LOCKED` | Kredensial benar tapi user locked (juga untuk sesi aktif yang di-lock) |
| 403 | `FORBIDDEN` | Role tidak berhak |
| 404 | `NOT_FOUND` | Data tidak ada / bukan milik Operator |
| 409 | `CONFLICT_DUPLICATE` | Unik dilanggar (`details[].field`: `code`, `username`, `email`, `name`) |
| 409 | `CONFLICT_IN_USE` | Dipakai relasi (BR-07/08/09) |
| 409 | `RECORD_VERIFIED_LOCKED` | Edit/hapus data terverifikasi (BR-17) |
| 409 | `LAST_ADMIN` / `SELF_ACTION_FORBIDDEN` | BR-05 |
| 422 | `PRICE_LIMIT_EXCEEDED` | BR-13; `details: { limit, total, excess }` |
| 422 | `SUBCATEGORY_NOT_FOUND` / `OPERATOR_INVALID` | Referensi tidak valid |
| 429 | `RATE_LIMITED` | Throttle login/umum |
| 500 | `INTERNAL_ERROR` | Tidak terduga (detail hanya di log) |

---

## 4. Auth

### `POST /auth/login`
Req: `{ "username": "administrator", "password": "Admin12345" }`
Res `200` + `Set-Cookie`:
```json
{ "data": { "user": { "id": "uuid", "username": "administrator", "name": "Administrator JMC", "email": "admin@jmc-indonesia.test", "role": "ADMIN" } } }
```
Urutan cek: user ada? → password cocok? → *baru* cek `isLocked` (agar status akun tidak bocor ke penebak). Waktu respons user-tidak-ada disamakan (hash dummy). Rate limit 5/menit per IP+username. Update `lastLoginAt`.

### `POST /auth/logout` → `204`, cookie dihapus.
### `GET /auth/me` → `200` `{ data: { user } }` (dipakai FE untuk RBAC UI).

---

## 5. Master Data

### 5.1 Categories
`GET /categories?page&pageSize&search&sortBy=code|name&sortOrder` (search: kode/nama)
```json
{ "data": [ { "id": "uuid", "code": "PK", "name": "Perlengkapan Kantor" } ], "meta": { "page": 1, "pageSize": 10, "totalItems": 2, "totalPages": 1 } }
```
`GET /categories/options` → `{ "data": [ { "id", "code", "name" } ] }` (tanpa paging, urut nama)

`POST /categories` — Req `{ "code": "PK", "name": "Perlengkapan Kantor" }` → `201 { data: {...} }`
Validasi: `code` wajib, 1–10, di-uppercase+trim; `name` wajib 1–100. Error: `409 CONFLICT_DUPLICATE` (`field: code`).
`PUT /categories/:id` — body sama → `200`.
`DELETE /categories/:id` → `204` | `409 CONFLICT_IN_USE` bila punya Sub Kategori.

### 5.2 Sub Categories
`GET /sub-categories?page&search&categoryId` (search: nama kategori / nama sub)
```json
{ "data": [ { "id": "uuid", "category": { "id": "uuid", "code": "PK", "name": "Perlengkapan Kantor" }, "name": "Alat Tulis", "priceLimit": 500000 } ], "meta": { ... } }
```
`GET /sub-categories/options?categoryId=<uuid>` → `{ "data": [ { "id", "name", "priceLimit", "categoryId" } ] }` (`categoryId` opsional; bila kosong → semua).
`POST /sub-categories` — Req `{ "categoryId": "uuid", "name": "Alat Tulis", "priceLimit": 500000 }` (`priceLimit`: integer 1..`MAX_MONEY`). → `201`.
`PUT` sama → `200`. `DELETE` → `204` | `409 CONFLICT_IN_USE` (dipakai Barang Masuk).
Duplikat `(categoryId, name)` case-insensitive → `409 CONFLICT_DUPLICATE`.

---

## 6. Users

`GET /users?page&search&role=ADMIN|OPERATOR` (search: username/nama)
```json
{ "data": [ { "id": "uuid", "username": "operator1", "name": "Budi Santoso", "email": "budi.santoso@jmc-indonesia.test", "role": "OPERATOR", "isLocked": false } ], "meta": { ... } }
```
`GET /users/options?role=OPERATOR` → `{ "data": [ { "id", "name", "username" } ] }` (hanya user **tidak locked**).

`POST /users` — Req:
```json
{ "role": "OPERATOR", "username": "operator4", "password": "Operator12345", "name": "Siti Rahmawati", "email": "siti.rahma@jmc-indonesia.test" }
```
Validasi: lihat PRD §3.5. Respons `201` tanpa password.
`PUT /users/:id` — sama, `password` opsional (AS-10). Mengubah role dirinya ke Operator sebagai Admin terakhir → `409 LAST_ADMIN`.
`PATCH /users/:id/lock` — Req `{ "locked": true }` → `200 { data: { id, isLocked } }`. Mengunci diri → `409 SELF_ACTION_FORBIDDEN`; mengunci Admin aktif terakhir → `409 LAST_ADMIN`.
`DELETE /users/:id` → `204` | `409 CONFLICT_IN_USE` (BR-09) | `409 SELF_ACTION_FORBIDDEN` | `409 LAST_ADMIN`.

---

## 7. Incoming Goods (Barang Masuk)

### 7.1 `GET /incoming-goods`
| Query | Tipe | Keterangan |
|---|---|---|
| `page`, `pageSize` | int | Default 1 / 10 |
| `categoryId` | uuid | Filter kategori |
| `subCategoryId` | uuid | Filter sub (harus milik `categoryId` bila keduanya ada, kalau tidak → hasil kosong) |
| `year` | int | Filter tahun (WIB) |
| `search` | string | `origin` atau nama sub kategori |
| `sortBy` | `transactionDate` \| `origin` \| `totalAmount` | Default `transactionDate` |
| `sortOrder` | `asc` \| `desc` | Default `desc` |

Respons:
```json
{
  "data": [
    {
      "id": "uuid",
      "transactionDate": "2026-10-04T03:00:00.000Z",
      "origin": "PT. Sidomakmur",
      "operator": { "id": "uuid", "name": "Liana Putri" },
      "unit": "Gudang Utama",
      "letterNumber": "SM/001/X/2026",
      "category": { "id": "uuid", "code": "PK", "name": "Perlengkapan Kantor" },
      "subCategory": { "id": "uuid", "name": "Alat Tulis", "priceLimit": 500000 },
      "totalAmount": 344000,
      "isVerified": false,
      "hasAttachment": false,
      "items": [
        { "id": "uuid", "lineNo": 1, "itemCode": "PK0001", "name": "Kertas HVS A4 60Gr", "unitPrice": 61000, "quantity": 4, "uom": "Rim", "lineTotal": 244000, "expiredDate": null },
        { "id": "uuid", "lineNo": 2, "itemCode": "PK0002", "name": "Bolpoin Pilot Std", "unitPrice": 20000, "quantity": 5, "uom": "Dus", "lineTotal": 100000, "expiredDate": "2027-12-31" }
      ]
    }
  ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 23, "totalPages": 3 }
}
```

### 7.2 `GET /incoming-goods/years` → `{ "data": [2026, 2025] }`

### 7.3 `POST /incoming-goods`
```json
{
  "operatorId": "uuid",
  "subCategoryId": "uuid",
  "origin": "PT. Sidomakmur",
  "letterNumber": "SM/001/X/2026",
  "items": [
    { "name": "Kertas HVS A4 60Gr", "unitPrice": 61000, "quantity": 4, "uom": "Rim", "expiredDate": null }
  ]
}
```
- `operatorId`: **wajib untuk Admin** (harus user OPERATOR aktif); **diabaikan** untuk Operator (BR-10).
- `categoryId`, `total`, `lineTotal`, `transactionDate`, `isVerified` **tidak diterima** (strict schema; kunci tak dikenal → `400`).
- Alur server: validasi skema → validasi referensi → hitung `lineTotal` → cek BR-13 → `$transaction`(counter kode, insert header+items, set `totalAmount`, `priceLimitSnapshot`).
- `201 { data: <detail seperti 7.1 satu objek> }`. Error: `400`, `404 SUBCATEGORY_NOT_FOUND`, `422 PRICE_LIMIT_EXCEEDED`:
```json
{ "error": { "code": "PRICE_LIMIT_EXCEEDED", "message": "Total harga melebihi batas harga sub kategori", "details": { "limit": 500000, "total": 600000, "excess": 100000 } } }
```

### 7.4 `GET /incoming-goods/:id` — detail (bentuk = item list + field `attachment: { fileName, size } | null`).
### 7.5 `PUT /incoming-goods/:id`
Body = POST + `items[].id` opsional (BR-15). Selain itu: `409 RECORD_VERIFIED_LOCKED` bila terverifikasi; Operator bukan pemilik → `404`. Revalidasi BR-13 terhadap batas **terkini** (AS-16).
### 7.6 `DELETE /incoming-goods/:id` → `204`; juga menghapus file lampiran (best effort, di luar transaksi DB).
### 7.7 `PATCH /incoming-goods/:id/verification` — `{ "verified": true }` → `200 { data: { id, isVerified, verifiedAt } }` (Admin).

### 7.8 `GET /incoming-goods/export`
Query = list tanpa `page/pageSize`. Respons: `200`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="barang-masuk_YYYYMMDD-HHmm.xlsx"`.
Isi (AS-18): sheet `Barang Masuk`, header tebal + freeze row, kolom:
`NO | TANGGAL (dd/MM/yyyy HH:mm:ss) | ASAL BARANG | PENERIMA | UNIT | KODE | NAMA | HARGA (RP.) | JUMLAH ("4 Rim") | TOTAL (RP.) | STATUS (Terverifikasi/Belum)`.
Kolom NO–UNIT & STATUS di-merge vertikal per transaksi. Format angka `#,##0` locale id. Lebih dari `MAX_EXPORT_ROWS` transaksi → `422 EXPORT_TOO_LARGE` (pesan: persempit filter).

### 7.9 `GET /incoming-goods/:id/print` → `200 application/pdf` (`Content-Disposition: inline`).
Isi: kop "PT JMC Indonesia", judul "SURAT BARANG MASUK", Nomor Surat, Tanggal, Asal Barang, Penerima, Kategori/Sub Kategori, tabel item (No, Kode, Nama, Harga, Jumlah+Satuan, Total, Tgl Expired), Grand Total, status verifikasi, blok tanda tangan (Penerima / Mengetahui).

### 7.10 Lampiran
- `POST /incoming-goods/:id/attachment` — `multipart/form-data`, field `file`. Validasi BR-19. Mengganti lampiran lama. `200 { data: { fileName, size } }`. `400 FILE_INVALID`.
- `GET .../attachment` → `200 { data: { url, fileName, expiresInSeconds: 60 } }` (signed URL Supabase Storage).
- `DELETE .../attachment` → `204`.
- Alur FE: simpan transaksi (JSON) → bila ada file, upload. Bila upload gagal: transaksi tetap tersimpan, FE menampilkan peringatan + tombol coba lagi.
- Lampiran terikat aturan yang sama dgn BR-17 (terverifikasi → `409`).

---

## 8. Health
`GET /health` → `200 { "status": "ok", "db": "up", "uptime": 123 }` | `503 { "status": "degraded", "db": "down" }`. Dipakai keep-alive & monitoring.

---

## 9. Matriks Otorisasi Singkat (untuk test e2e)

| Skenario | Admin | Operator |
|---|:-:|:-:|
| `GET /users`, `POST /categories`, `DELETE /sub-categories/:id` | 2xx | 403 |
| `GET /categories/options` | 200 | 200 |
| `GET /incoming-goods` | semua | hanya milik |
| `GET /incoming-goods/:id` milik orang lain | 200 | 404 |
| `PATCH .../verification` | 200 | 403 |
| `PUT/DELETE` data terverifikasi | 409 | 409 |
| `POST /incoming-goods` dgn `operatorId` orang lain | dipakai | diabaikan (dipaksa diri sendiri) |

---

## 10. Catatan Implementasi
- Skema Zod di `packages/shared/src/schemas/*.ts` adalah sumber DTO + tipe + validasi FE; Swagger dibangkitkan dari DTO (`nestjs-zod`).
- `ZodValidationPipe` global; `AllExceptionsFilter` memetakan Prisma `P2002` → `CONFLICT_DUPLICATE`, `P2003` → `CONFLICT_IN_USE`, `P2025` → `NOT_FOUND`.
- `TransformInterceptor` membungkus `{ data }`; `Decimal` → `number` di mapper (jangan bocorkan objek Decimal).
