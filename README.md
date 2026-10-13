# Aplikasi Pengelolaan Barang — PT JMC Indonesia

> Test Teknis Fullstack Programmer (Level Medium)

| | |
|---|---|
| 🔗 **Link Deployment (Live App)** | **https://GANTI-DENGAN-URL-VERCEL.vercel.app** |
| 🎬 **Link Video Demo** | **https://GANTI-DENGAN-URL-VIDEO** |
| 📘 Dokumentasi API (Swagger) | https://GANTI-DENGAN-URL-RENDER.onrender.com/api/docs |

> ⏳ **Catatan untuk penilai:** backend berjalan di hosting gratis. Jika request pertama terasa lambat (±30–60 detik), itu *cold start*; mohon tunggu sebentar lalu muat ulang. Sistem keep-alive sudah dipasang untuk meminimalkan hal ini.

---

## 1. Tech Stack yang Digunakan

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js (App Router, React), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query & Table, React Hook Form + Zod |
| **Backend** | NestJS (TypeScript), Prisma ORM, Zod (`nestjs-zod`), JWT (cookie `httpOnly`), argon2id, exceljs, pdfmake |
| **Database** | PostgreSQL (Supabase) |
| **Storage lampiran** | Supabase Storage (bucket private, signed URL) |
| **Deployment** | Vercel (web) · Render (API) · Supabase (DB & storage) |
| **Tooling** | npm workspaces (monorepo), ESLint, Prettier, Jest, GitHub Actions |

---

## 2. Akun Pengujian (Kredensial)

| Role | Username | Password | Keterangan |
|---|---|---|---|
| **Admin** | `administrator` | `Admin12345` | Akses semua modul |
| **Operator** | `operator1` | `Operator12345` | Budi Santoso — hanya Barang Masuk |
| **Operator** | `operator2` | `Operator12345` | Liana Putri — hanya Barang Masuk |
| Operator (terkunci) | `operator3` | `Operator12345` | Untuk demo fitur Lock — login akan ditolak |

> Akun di atas hanya untuk keperluan demo/penilaian.

---

## 3. Fitur

| Modul | Admin | Operator |
|---|:-:|:-:|
| Halaman Login | ✔ | ✔ |
| Barang Masuk | ✔ (semua data) | ✔ (data milik sendiri) |
| Master Data › Kategori | ✔ | — |
| Master Data › Sub Kategori | ✔ | — |
| Manajemen User (termasuk Lock/Unlock) | ✔ | — |

**Barang Masuk**
- Paging 10 data/halaman, filter Kategori → Sub Kategori (berantai) dan Tahun, pencarian (asal barang / sub kategori), sorting (tanggal, asal barang, total harga)
- Form dengan baris item dinamis (`+` / `x`), total otomatis, masking Rupiah
- **Validasi batas harga**: total seluruh item tidak boleh melebihi Batas Harga Sub Kategori (divalidasi di client **dan** server)
- Export Excel (mengikuti filter, pencarian, dan urutan aktif)
- Cetak Surat Barang Masuk (PDF) per transaksi
- Status verifikasi (toggle centang hijau; data terverifikasi terkunci dari edit/hapus)
- Lampiran `.doc` / `.docx` / `.zip` (maks 4 MB)

**Keamanan:** RBAC di API, lock user berlaku seketika, password di-hash argon2id, rate limit login, cookie `httpOnly`, validasi tipe file (ekstensi + MIME + magic bytes).

---

## 4. Petunjuk Instalasi Lokal

### Prasyarat
Node.js LTS (≥ 22), npm ≥ 10 (sudah termasuk dalam Node.js — tidak perlu pnpm/yarn), Docker dengan Compose v2 (untuk PostgreSQL lokal), Git.

> Windows: jalankan perintah di **Git Bash** (atau WSL). Docker Desktop harus berjalan sebelum `docker compose`.

### Langkah

```bash
# 1. Clone & install (satu kali di root; semua workspace ikut terpasang)
git clone <URL-REPOSITORY> && cd <NAMA-FOLDER>
npm ci

# 2. Jalankan PostgreSQL lokal (menunggu sampai healthy)
docker compose up -d --wait db

# 3. Siapkan environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# (edit nilai bila perlu — lihat tabel di bawah)

# 4. Migrasi database & seed data contoh
npm run db:migrate
npm run db:seed

# 5. Jalankan aplikasi
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api/docs

Login memakai akun pada bagian [Akun Pengujian](#2-akun-pengujian-kredensial).

### Variabel lingkungan utama

| File | Variabel | Contoh |
|---|---|---|
| `apps/api/.env` | `DATABASE_URL` | `postgresql://jmc:jmc@localhost:5432/jmc_barang` |
| | `DIRECT_URL` | sama dengan `DATABASE_URL` (lokal) |
| | `JWT_SECRET` | string acak ≥ 32 karakter |
| | `CORS_ORIGINS` | `http://localhost:3000` |
| | `COOKIE_SECURE` | `false` (lokal) |
| | `STORAGE_DRIVER` | `local` (lokal) atau `supabase` |
| | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | hanya jika `STORAGE_DRIVER=supabase` |
| `apps/web/.env.local` | `API_URL` | `http://localhost:4000` |

Daftar lengkap & panduan deploy: [`docs/SETUP.md`](docs/SETUP.md).

### Perintah berguna

| Perintah | Fungsi |
|---|---|
| `npm run lint` / `npm run typecheck` | Pemeriksaan kode |
| `npm test` | Unit test |
| `npm run test:e2e` | E2E API (butuh DB test) |
| `npm run build` | Build produksi |
| `npm run db:studio` | Lihat isi database (Prisma Studio) |

---

## 5. Struktur Proyek

```
.
├─ apps/
│  ├─ api/            # NestJS + Prisma (migrasi & seed di apps/api/prisma)
│  └─ web/            # Next.js
├─ packages/shared/   # Skema Zod & konstanta yang dipakai FE + BE
└─ docs/              # Dokumentasi proyek
```

## 6. Dokumentasi

| Dokumen | Isi |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Panduan konteks untuk AI coding agent |
| [`docs/PRD.md`](docs/PRD.md) | Kebutuhan produk, aturan bisnis, asumsi, acceptance criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arsitektur & keputusan (ADR) |
| [`docs/API_SPEC.md`](docs/API_SPEC.md) | Kontrak REST API |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Skema database, constraint, index |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Panduan UI/UX |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Rencana kerja & checklist |
| [`docs/SETUP.md`](docs/SETUP.md) | Konfigurasi & deployment |

---

## 7. Asumsi & Keputusan Penting

Beberapa hal tidak dijelaskan eksplisit pada soal. Keputusan yang diambil (lengkap di [`docs/PRD.md` §5](docs/PRD.md)):

- Kolom **Penerima** = operator transaksi; **Unit** = "Gudang Utama"; **Kode** = kode barang otomatis (`{KODE_KATEGORI}{NNNN}`).
- Tanggal transaksi diisi otomatis oleh server (WIB pada tampilan).
- Verifikasi hanya dapat dilakukan **Admin**; data terverifikasi tidak dapat diedit/dihapus sampai verifikasi dicabut.
- Operator hanya melihat dan mengelola transaksi miliknya.
- Batas Harga bersifat inklusif (`total ≤ batas`) dan tidak retroaktif.
- Aturan panjang minimum 8 karakter (Username, Nama, Email) mengikuti spesifikasi soal.

---

## 8. Catatan Deployment

- **Web** di Vercel; semua request `/api/*` di-*proxy* ke API di Render sehingga cookie sesi bersifat same-origin.
- **API** di Render menjalankan `prisma migrate deploy` saat start.
- **DB & file** di Supabase.
- Workflow GitHub Actions `keepalive` memanggil `/api/v1/health` secara berkala.
