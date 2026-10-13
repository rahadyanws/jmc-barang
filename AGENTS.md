# AGENTS.md — Panduan untuk AI Coding Agent

> **BACA FILE INI PERTAMA di setiap sesi baru / setelah konteks terpotong.**
> Proyek: **Aplikasi Pengelolaan Barang — PT JMC Indonesia** (Test Teknis Fullstack, Level Medium, target kualitas: Senior).
> Bahasa: dokumen & UI = **Bahasa Indonesia**; kode, nama variabel, commit message = **English**.

---

## 0. Cara memakai dokumen ini

Dokumen proyek ada di `docs/`. Jika dua dokumen bertentangan, **yang di atas menang**:

| Prioritas | Dokumen | Isi |
|---|---|---|
| 1 | `docs/PRD.md` | Kebutuhan, Business Rules (`BR-xx`), Asumsi (`AS-xx`), Acceptance Criteria |
| 2 | `docs/API_SPEC.md` | Kontrak REST API (endpoint, payload, error code) |
| 3 | `docs/DATABASE_SCHEMA.md` | Skema Prisma, constraint, index, seed |
| 4 | `docs/ARCHITECTURE.md` | Keputusan arsitektur (`ADR-xx`), struktur modul, alur |
| 5 | `docs/DESIGN.md` | UI/UX, komponen, copywriting |
| 6 | `docs/ROADMAP.md` | Urutan kerja + **status progres (checklist)** |
| 7 | `docs/SETUP.md` | Env, perintah, deployment |

Soal asli (PDF test teknis) diringkas di PRD. **Jangan menambah fitur di luar PRD** dan **jangan mengurangi** yang ada di PRD.

Rujuk ID dalam kode/komentar/commit, mis. `// BR-13: total <= priceLimit`.

---

## 1. Ringkasan proyek (30 detik)

Web app internal untuk mencatat **Barang Masuk**. Barang dikelompokkan **Kategori → Sub Kategori**. Tiap Sub Kategori punya **Batas Harga**; total seluruh item dalam satu transaksi Barang Masuk **tidak boleh melebihi** Batas Harga itu. Dua role: **ADMIN** (semua modul) dan **OPERATOR** (hanya Login + Barang Masuk).

Fitur "sulit" yang sering terlewat (jangan lupa!):
1. Form item dinamis (tambah/hapus baris) + total otomatis + validasi total ≤ batas harga (server **dan** client).
2. Filter berantai Kategori → Sub Kategori (di tabel **dan** di form).
3. Export Excel mengikuti filter + search + sort aktif.
4. Cetak Surat Masuk per baris (PDF).
5. Toggle verifikasi (ikon centang hijau) + efek kunci edit/hapus.
6. Lock/Unlock user (efek **langsung**, bukan menunggu token kedaluwarsa).
7. Masking Rupiah ribuan (`1.234.567`) di input Harga & Batas Harga.
8. Paging 10 data/halaman di semua tabel; search; sorting (Barang Masuk).

---

## 2. Tech stack (FINAL — jangan diganti tanpa ADR baru)

| Layer | Pilihan |
|---|---|
| Monorepo | **npm workspaces**: `apps/web`, `apps/api`, `packages/shared` (nama paket `@jmc/web`, `@jmc/api`, `@jmc/shared`) |
| Frontend | Next.js (App Router, React 18+), TypeScript strict |
| UI | Tailwind CSS, shadcn/ui (Radix), lucide-react, sonner (toast) |
| Data fetching | TanStack Query v5, TanStack Table v8 (headless) |
| Form | React Hook Form + Zod (`@hookform/resolvers`) |
| Backend | NestJS (TypeScript strict), modular |
| Validasi API | Zod schema dari `packages/shared` via `nestjs-zod` |
| ORM | **Prisma saja** (TypeORM TIDAK dipakai) |
| DB | PostgreSQL (Supabase; pooled URL runtime + direct URL migrasi) |
| Storage lampiran | Supabase Storage (bucket **private**) |
| Auth | JWT di cookie `httpOnly` (+ `Authorization: Bearer` juga diterima), hash `argon2id` |
| Excel / PDF | `exceljs` / `pdfmake` (server-side) |
| Test | Jest + Supertest (API), Vitest + Testing Library (web, opsional), Playwright (smoke, opsional) |
| Deploy | Vercel (web), Render (api), Supabase (db + storage) |

Pin versi **exact** di `package.json` saat inisialisasi (jangan `latest`; `.npmrc` berisi `save-exact=true`). Gunakan Node.js LTS (≥ 22) dan npm ≥ 10.

**Aturan package manager (npm saja)**
- Satu lockfile di root: `package-lock.json` (commit). **Jangan** membuat `pnpm-lock.yaml` / `yarn.lock` / lockfile per-workspace.
- Install dari root saja: `npm ci` (bersih, sesuai lockfile) atau `npm install <pkg> -w @jmc/api` untuk menambah dependensi ke satu workspace. Jangan `npm install` di dalam `apps/*`.
- Dependensi antar-workspace ditulis `"@jmc/shared": "*"` (npm **tidak** mendukung protokol `workspace:*`).
- Jalankan skrip workspace dengan `npm run <skrip> -w @jmc/<nama>`; skrip yang sering dipakai sudah ada pintasannya di root (§4).
- `engines` di root `package.json` + `.nvmrc` (`22`) + `engine-strict=true` di `.npmrc` menjaga versi Node tetap konsisten.

---

## 3. Struktur repo

```
.
├─ AGENTS.md
├─ README.md                  # WAJIB: link live app + link video DI BARIS ATAS
├─ docs/                      # PRD, API_SPEC, ARCHITECTURE, DATABASE_SCHEMA, DESIGN, ROADMAP, SETUP
├─ apps/
│  ├─ api/                    # NestJS
│  │  ├─ prisma/              # schema.prisma, migrations/, seed.ts
│  │  └─ src/
│  │     ├─ common/           # guards, filters, interceptors, decorators, utils (money, date)
│  │     ├─ config/           # env validation (zod)
│  │     ├─ prisma/           # PrismaModule/Service
│  │     └─ modules/{auth,users,categories,sub-categories,incoming-goods,storage,health}/
│  └─ web/                    # Next.js
│     └─ src/
│        ├─ app/              # routes: (auth)/login, (app)/barang-masuk, master-data/*, manajemen-user
│        ├─ components/       # ui/ (shadcn), shared/ (DataTable, RupiahInput, ConfirmDialog, ...)
│        ├─ features/{incoming-goods,categories,sub-categories,users,auth}/{api,components,hooks}
│        └─ lib/              # api-client, format, query-keys
└─ packages/shared/           # Zod schema, enum, konstanta batas, tipe — SATU sumber kebenaran FE+BE
```

---

## 4. Perintah penting

```bash
npm ci                        # install dari lockfile (npm install bila menambah paket)
docker compose up -d --wait db           # PostgreSQL lokal
npm run dev                    # api (:4000) + web (:3000) paralel (shared di-build otomatis via predev)
npm run db:migrate             # buat/apply migrasi lokal  (prisma migrate dev)
npm run db:seed                # prisma db seed
npm run lint && npm run typecheck && npm test   # WAJIB hijau sebelum bilang "selesai"
npm run build
```
Detail env & deploy: `docs/SETUP.md`.

---

## 5. INVARIANT — tidak boleh dilanggar

Lihat definisi lengkap di PRD §6. Ringkasan:

1. **Server adalah otoritas.** Semua validasi di client **juga** divalidasi ulang di server. Nilai `total`, `operatorId` (untuk Operator), `transactionDate`, `isVerified` dari client **tidak dipercaya** (BR-10, BR-12, BR-16, BR-17).
2. **BR-13**: `Σ(unitPrice × quantity) ≤ subCategory.priceLimit` (inklusif). Error `422 PRICE_LIMIT_EXCEEDED`. Dihitung di service dalam transaksi DB yang sama dengan penyimpanan.
3. **Uang = integer Rupiah** (`NUMERIC(18,0)`), tanpa float. Tampilan `id-ID` (`1.234.567`). Jangan `parseFloat` pada input berformat (BR-24).
4. **Lock user berlaku segera**: `JwtStrategy` memuat user dari DB tiap request & menolak bila `isLocked` (BR-02).
5. **Operator hanya melihat/mengubah transaksi miliknya** (BR-18). Setiap query Barang Masuk **wajib** melewati helper `scopeByUser(user)`.
6. **Header + items disimpan atomik** (satu `prisma.$transaction`) (BR-23).
7. **Password tidak pernah** keluar dari API / log. Gunakan `select` eksplisit, bukan `findMany()` polos pada `User`.
8. **Endpoint master/user = ADMIN only** (`@Roles('ADMIN')`). Endpoint `options` (dropdown) boleh semua role terautentikasi.
9. **Lampiran** private; akses lewat signed URL berumur pendek; validasi ekstensi + MIME + magic bytes + ukuran (BR-19).
10. **Format error** seragam (API_SPEC §3). Jangan lempar string/`Error` mentah ke client.
11. **Zona waktu**: simpan `timestamptz` UTC; tampil & filter tahun memakai `Asia/Jakarta` (UTC+7).
12. **Pagination 10 baris = 10 transaksi** (bukan 10 item) (BR-22).

---

## 6. Konvensi kode

- TypeScript `strict: true`; **dilarang `any`** (gunakan `unknown` + narrowing). Tidak ada `@ts-ignore` tanpa komentar alasan.
- Satu modul NestJS = `controller` (HTTP saja) → `service` (aturan bisnis) → Prisma. **Controller tidak boleh berisi logika bisnis / query Prisma.**
- DTO = `createZodDto(schema)` dari `packages/shared`. Jangan menulis ulang aturan validasi di FE & BE secara terpisah.
- Penamaan: file `kebab-case`, class `PascalCase`, variabel `camelCase`, kolom DB `snake_case` (via `@map`), konstanta `UPPER_SNAKE`.
- Endpoint: `kebab-case`, jamak (`/sub-categories`, `/incoming-goods`). Path & JSON field `camelCase`.
- Frontend: komponen server secara default; `"use client"` hanya untuk komponen interaktif. State tabel (page, search, filter, sort) disimpan di **URL searchParams**.
- Query key terpusat di `lib/query-keys.ts`; mutasi wajib `invalidateQueries` yang relevan.
- Teks UI di `lib/messages.ts` (Bahasa Indonesia) — jangan hardcode tersebar. Rujuk `docs/DESIGN.md` §9.
- Commit: Conventional Commits, mis. `feat(incoming-goods): enforce price limit (BR-13)`.
- Satu PR/commit = satu *vertical slice* kecil yang bisa dites.

---

## 7. Alur kerja agent (WAJIB)

**Sebelum menulis kode**
1. Baca `docs/ROADMAP.md` → ambil item `[ ]` pertama yang dependensinya selesai.
2. Baca bagian dokumen yang relevan (PRD modul, API endpoint, schema tabel, DESIGN halaman).
3. Tulis rencana singkat (file yang disentuh, risiko, test yang akan dibuat).

**Saat mengerjakan**
4. Kerjakan vertical slice: schema → service → controller → test → UI → test.
5. Bila **ambigu**: jangan menebak diam-diam. Gunakan default di PRD §5 (`AS-xx`); jika belum ada, tambahkan entri baru di PRD §11 *Open Questions* dan lanjut dengan opsi paling aman + konsisten dengan soal asli.
6. Bila perlu **menyimpang** dari dokumen: ubah dokumen di commit yang sama (dan tambah ADR bila arsitektural). Dokumen dan kode tidak boleh berbeda.

**Sebelum menyatakan selesai (Definition of Done)**
- [ ] `npm run lint && npm run typecheck && npm test` hijau
- [ ] Acceptance Criteria terkait di PRD terpenuhi (sebutkan ID: `AC-xx`)
- [ ] RBAC dicek: Admin ✔, Operator ✔/✖ sesuai matriks PRD §2
- [ ] Error path dites (validasi, 401/403/404/409/422)
- [ ] Contoh request/response di `API_SPEC.md` masih akurat
- [ ] Checklist `ROADMAP.md` + **Progress Log** diperbarui
- [ ] Tidak ada secret, `console.log` debug, atau TODO tanpa issue

---

## 8. Larangan

- ❌ Menyimpan JWT di `localStorage`.
- ❌ Menghitung/mempercayai `total` dari client.
- ❌ Menggunakan disk lokal untuk lampiran (filesystem Render bersifat sementara).
- ❌ `SELECT *` / mengembalikan entitas `User` utuh.
- ❌ Query N+1 di list Barang Masuk (gunakan `include` / `select` terkontrol).
- ❌ Menambah library besar tanpa alasan (Puppeteer, Moment, Lodash penuh, dsb.).
- ❌ Mengubah migrasi yang sudah di-commit (buat migrasi baru).
- ❌ Mengabaikan test yang gagal dengan `.skip`.
- ❌ Menghapus/menyembunyikan fitur karena "sulit".
- ❌ Mencampur package manager (pnpm/yarn) atau mengkomit lockfile selain `package-lock.json`.

---

## 9. Jebakan umum (baca sebelum coding)

| Jebakan | Cara benar |
|---|---|
| Ubah Kategori di form tapi Sub Kategori lama masih terpilih | Reset `subCategoryId` + Batas Harga saat Kategori berubah |
| Ganti Sub Kategori tapi total sudah melebihi batas baru | Revalidasi total saat Sub Kategori berubah |
| Mask Rupiah bikin nilai jadi string "61.000" lalu dikali | Simpan **number** di form state; mask hanya tampilan |
| Edit transaksi menghapus semua item lalu insert ulang | Sinkronisasi per `id` (update / insert / delete) agar `itemCode` stabil |
| Filter tahun salah di pergantian tahun | Batas tahun dihitung di WIB: `[YYYY-01-01T00:00+07:00, YYYY+1-01-01T00:00+07:00)` |
| Export mengabaikan search/sort | Gunakan builder `where/orderBy` yang **sama** dengan list |
| Admin menghapus dirinya / Admin terakhir | Guard di `UsersService` (BR-05) |
| Hapus kategori yang masih punya sub | FK `ON DELETE RESTRICT` + tangkap error → `409 CONFLICT_IN_USE` |
| Cold start Render membuat login timeout | Lihat ADR-10 (keep-alive) & loading state di FE |

---

## 10. Prompt pemulihan konteks (tempel di awal sesi baru)

```
Baca AGENTS.md, lalu docs/ROADMAP.md (cari item [ ] berikutnya) dan bagian PRD/API/DB yang relevan.
Ringkas kembali: (1) item yang akan dikerjakan, (2) BR/AS/AC yang terkait, (3) file yang akan disentuh.
Tunggu konfirmasi saya sebelum menulis kode bila ada ambiguitas.
```
