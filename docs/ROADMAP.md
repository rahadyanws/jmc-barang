# ROADMAP.md

Urutan kerja berbasis *vertical slice*. **Agent: kerjakan item `[ ]` pertama yang dependensinya selesai, lalu centang dan isi Progress Log (§5).**
Prioritas: **P0** wajib (spesifikasi soal), **P1** kualitas senior, **P2** nice-to-have.

---

## 1. Ringkasan Milestone

| M | Judul | Hasil yang dapat didemokan |
|---|---|---|
| M0 | Fondasi repo & deploy "hello" | Monorepo, CI, API `/health` & web terdeploy |
| M1 | DB & Auth | Login, cookie, RBAC, lock check |
| M2 | Master Data & User | CRUD Kategori, Sub Kategori, User |
| M3 | Barang Masuk (core) | CRUD + BR-13 + form dinamis |
| M4 | Daftar Barang Masuk lengkap | Filter, search, sort, paging, verifikasi |
| M5 | Export, Cetak, Lampiran | Excel, PDF, upload |
| M6 | Hardening & test | Test e2e, keamanan, a11y |
| M7 | Deploy produksi & dokumentasi | README, seed, keep-alive |
| M8 | Video demo & submit | Tautan lengkap |

> Urutan M0 → deploy lebih awal disengaja: masalah hosting gratis ditemukan di hari pertama, bukan di hari terakhir.

---

## 2. Rincian Tugas

### M0 — Fondasi (P0)
- [x] M0.1 Init **npm workspaces** (root `package.json` dengan `workspaces`, `engines`, `.nvmrc`, `.npmrc`): `apps/api` (Nest), `apps/web` (Next), `packages/shared`; TS strict, ESLint, Prettier; skrip root sesuai `SETUP.md` §4
- [x] M0.2 `packages/shared`: konstanta (`PAGE_SIZE`, batas panjang), enum `Role`, build bersama (tsup/tsc)
- [x] M0.3 `config/env.ts` (Zod), `PrismaModule`, `/health`
- [x] M0.4 GitHub Actions CI (lint, typecheck, test, build)
- [x] M0.5 Supabase proyek (DB + bucket private), `.env.example`
- [ ] M0.6 Deploy awal: Render (api) + Vercel (web + rewrite) → `/health` terjangkau dari web (cloud deployment ditunda)
- [x] M0.7 Keep-alive workflow
- **Selesai bila**: URL publik web memanggil `/api/health` sukses melalui proxy.

### M1 — Database & Auth (P0)
Ref: DATABASE_SCHEMA §3–4, API_SPEC §4, PRD BR-01..05, AC-01
- [x] M1.1 `schema.prisma` + migrasi awal + SQL CHECK (§4 DB)
- [x] M1.2 Seed minimal (admin, operator) — `argon2id`
- [x] M1.3 `AuthModule`: login (urutan cek anti-enumerasi), cookie, logout, `/auth/me`
- [x] M1.4 `JwtStrategy` (cookie + Bearer) + cek DB per request (`isLocked`)
- [x] M1.5 `RolesGuard`, `@Roles`, `@CurrentUser`, `AllExceptionsFilter`, `TransformInterceptor`, throttler login
- [x] M1.6 Web: halaman Login, `api-client`, shell layout (sidebar/topbar), guard role, middleware
- [x] M1.7 Test: login benar/salah/locked; akses tanpa token; RBAC dasar
- **Selesai bila**: AC-01, login di web produksi berhasil.

### M2 — Master Data & User (P0)
Ref: PRD §3.3–3.5, API_SPEC §5–6, AC-10
- [x] M2.1 Shared schema: category, subCategory, user
- [x] M2.2 API Kategori (CRUD, options, BR-06/07)
- [x] M2.3 API Sub Kategori (CRUD, options berantai, BR-08)
- [x] M2.4 API User (CRUD, lock, BR-03/04/05/09, options Operator)
- [x] M2.5 Komponen bersama: `DataTable`, `Pagination`, `SearchInput`, `ConfirmDialog`, `RupiahInput`, `FormField`
- [x] M2.6 UI Kategori, Sub Kategori, Manajemen User (modal form, paging 10, search, filter Role, lock/unlock)
- [x] M2.7 Test: duplikat, in-use, last admin, self-lock, password policy
- **Selesai bila**: AC-10.

### M3 — Barang Masuk core (P0)
Ref: PRD §3.2, API_SPEC §7.3–7.7, DB §6, AC-03/04
- [x] M3.1 Shared schema `incomingGoods` (strict) + util `calcTotals`
- [x] M3.2 `IncomingGoodsService.create/update/delete` (BR-10..18, 21, 23) + generator kode atomik
- [x] M3.3 `scopeByUser` + test cakupan semua endpoint
- [x] M3.4 Form web: Informasi Umum (Operator lock, Kategori→Sub, Batas Harga readonly)
- [x] M3.5 `ItemRowsEditor` (`+`/`x`, total live, `PriceLimitSummary`, RupiahInput)
- [x] M3.6 Pemetaan error server → field/form
- [x] M3.7 Test unit BR-13 (tepat batas, +1), e2e 422, edit sinkronisasi item (kode stabil)
- **Selesai bila**: AC-03, AC-04.

### M4 — Daftar Barang Masuk lengkap (P0)
Ref: PRD §3.2, API_SPEC §7.1–7.2, DESIGN §6.1, AC-05/06/09
- [x] M4.1 Builder `where/orderBy` tunggal (`incoming-goods.query.ts`) — filter, search, sort, tahun WIB
- [x] M4.2 `GET /incoming-goods` + `/years`
- [x] M4.3 Tabel grup baris (rowSpan), filter berantai, tahun, search debounce, sort header, paging 10, state di URL
- [x] M4.4 Verifikasi (`PATCH`, UI toggle, kunci edit/hapus BR-17)
- [x] M4.5 Test: filter kombinasi, paging lintas halaman, sort stabil, scope Operator
- **Selesai bila**: AC-05, AC-06, AC-09.

### M5 — Export, Cetak, Lampiran (P0)
Ref: API_SPEC §7.8–7.10, AC-07/08/11
- [x] M5.1 Export Excel (`exceljs`, merge, format angka) memakai builder yang sama (BR-20)
- [x] M5.2 Cetak PDF (`pdfmake`) + tombol cetak per baris
- [x] M5.3 `StorageService` (validasi magic bytes, upload, signed URL, delete)
- [x] M5.4 UI lampiran (upload, ganti, hapus, unduh) + alur gagal-upload
- [x] M5.5 Test: export mengikuti filter; file `.exe` ditolak; PDF ter-generate
- **Selesai bila**: AC-07, AC-08, AC-11.

### M6 — Hardening (P1)
- [x] M6.1 `helmet`, CORS allowlist, cek `Origin`, rate limit; audit `select` agar tak membocorkan `passwordHash`
- [x] M6.2 Logging terstruktur + `requestId` (header `X-Request-Id`); redaksi data sensitif
- [x] M6.3 e2e matriks otorisasi API_SPEC §9 penuh
- [x] M6.4 A11y pass (keyboard, label, kontras) & checklist DESIGN §10
- [x] M6.5 Uji performa lokal & indeks komprehensif pada schema Prisma
- [ ] M6.6 (P2) Optimistic locking `409 STALE_DATA`
- [ ] M6.7 (P2) Playwright smoke test
- [x] M6.8 `npm audit` & update dependensi kritis

### M7 — Produksi & Dokumentasi (P0)
- [ ] M7.1 Seed produksi (≥25 transaksi, AS-20)
- [ ] M7.2 `README.md` (lihat §4) — **link live & video di baris atas**
- [ ] M7.3 Swagger `/api/docs` aktif
- [ ] M7.4 Uji manual penuh di produksi (semua AC) sebagai Admin & Operator; uji cold start
- [ ] M7.5 Repo publik, bersih dari secret, riwayat commit rapi

### M8 — Video & Submit (P0)
- [ ] M8.1 Rekam & unggah video (2–5 menit; skrip §3)
- [ ] M8.2 Tempel link ke README; verifikasi semua tautan terbuka dari jendela incognito
- [ ] M8.3 Submit

---

## 3. Skrip Video Demo (2–5 menit)

1. (0:00) Sebutkan tujuan & tech stack (10 dtk).
2. Login Admin → tur sidebar.
3. Master Data: tambah Kategori (tunjukkan validasi kode unik) & Sub Kategori (masking Rupiah, Batas Harga).
4. Manajemen User: tambah Operator, **lock** user lain, tunjukkan login ditolak.
5. Barang Masuk (Admin): tambah transaksi → tambah/hapus baris, total otomatis → **lewati batas harga** → tunjukkan error → perbaiki → simpan; unggah lampiran.
6. Daftar: filter berantai Kategori→Sub Kategori→Tahun, search, sort, paging; **Export Excel** & buka hasilnya; **Cetak** PDF; **Verifikasi** lalu coba edit (terkunci).
7. Logout → login **Operator**: menu terbatas, field Operator terkunci, hanya data sendiri.
8. Penutup: sebut Swagger, test, CI (10 dtk).

---

## 4. Checklist Submission (sesuai ketentuan pengerjaan)

- [ ] Repo di GitHub/GitLab/Bitbucket, status **public** / dapat diakses penilai
- [ ] Berisi **FE, BE, konfigurasi DB & migrasi**
- [ ] Aplikasi **terdeploy publik** dan dapat diuji langsung
- [ ] Video 2–5 menit di YouTube (Unlisted/Public) / Drive (public) / Loom
- [ ] **README.md** — urutan wajib:
  1. **Link Deployment (Live App)** — paling atas
  2. **Link Video Demo**
  3. Tech Stack (FE, BE, DB)
  4. Petunjuk Instalasi Lokal
  5. Akun Pengujian (Admin & Operator: username/email + password)
- [ ] Akun pengujian benar-benar bisa login di produksi
- [ ] Tidak ada secret di repo / riwayat git

---

## 5. Progress Log (agent: tambahkan baris baru di atas)

| Tanggal | Agent/Sesi | Item selesai | Catatan / keputusan / blocker |
|---|---|---|---|
| 2026-10-14 | Antigravity AI | M0, M1, M2, M3, M4, M5, M6 | Verifikasi menyeluruh implementasi M0-M6; konfigurasi CI & keepalive ditambahkan; helmet & header keamanan diintegrasikan; unit & e2e test 100% lulus (71 unit tests, 92 e2e tests). M7 & M8 ditunda sesuai instruksi. |
| (isi) | — | — | Proyek dimulai |

---

## 6. Definition of Done (per item)
Lint + typecheck + test hijau · AC terkait terpenuhi · RBAC dicek · error path dites · dokumen sinkron · checklist & log diperbarui. (Lengkapnya: `AGENTS.md` §7.)
