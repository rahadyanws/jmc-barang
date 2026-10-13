# SETUP.md — Instalasi, Konfigurasi & Deployment

---

## 1. Prasyarat

| Alat | Versi |
|---|---|
| Node.js | LTS ≥ 22 (diuji pada v22.22.2) |
| npm | ≥ 10 (sudah bawaan Node.js; diuji pada 10.9.7) — **tidak perlu pnpm/yarn/corepack** |
| Docker (opsional) | Engine/Desktop dengan Compose v2 (`docker compose`); diuji pada 29.x |
| Git | terbaru |
| Akun | GitHub, Vercel, Render, Supabase |

> **Kenapa npm workspaces?** Sudah terpasang bersama Node.js, satu lockfile (`package-lock.json`), didukung native oleh Vercel & Render, dan penilai cukup menjalankan `npm ci`. Keputusan lengkap: `ARCHITECTURE.md` ADR-01.
>
> **Windows:** jalankan semua perintah di **Git Bash** (atau WSL). Docker Desktop harus aktif. Tambahkan `.gitattributes` berisi `* text=auto eol=lf` agar skrip/`.sh` tidak rusak oleh CRLF.

---

## 2. Jalankan Lokal

```bash
git clone <repo-url> && cd <repo>
npm ci                             # install semua workspace dari lockfile (di root saja)

# 1) Database lokal
docker compose up -d --wait db     # tunggu healthy; lihat docker-compose.yml di bawah

# 2) Env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3) Migrasi + seed
npm run db:migrate
npm run db:seed

# 4) Jalankan
npm run dev                        # api http://localhost:4000, web http://localhost:3000
```
> `cp` tersedia di Git Bash. Di PowerShell gunakan `Copy-Item`.
Swagger: http://localhost:4000/api/docs

### docker-compose.yml (lokal)
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: jmc
      POSTGRES_PASSWORD: jmc
      POSTGRES_DB: jmc_barang
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jmc -d jmc_barang"]
      interval: 3s
      timeout: 3s
      retries: 10
volumes:
  pgdata:
```

### Penyimpanan lampiran saat lokal
Gunakan **proyek Supabase dev** (bucket private) atau, khusus dev, driver `LOCAL` (`STORAGE_DRIVER=local`, folder `./.uploads` yang di-ignore git). Driver `LOCAL` **dilarang** di produksi (ADR-05).

---

## 3. Variabel Lingkungan

### `apps/api/.env`
| Variabel | Contoh | Keterangan |
|---|---|---|
| `NODE_ENV` | `development` | `production` di Render |
| `PORT` | `4000` | Render menyediakan `PORT` otomatis |
| `DATABASE_URL` | `postgresql://jmc:jmc@localhost:5432/jmc_barang` | Prod: **pooler** Supabase + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | sama dengan di atas | Prod: koneksi langsung Supabase (untuk migrasi) |
| `JWT_SECRET` | string acak ≥ 32 byte | `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `8h` | |
| `COOKIE_NAME` | `jmc_session` | |
| `COOKIE_SECURE` | `false` (dev) / `true` (prod) | |
| `CORS_ORIGINS` | `http://localhost:3000` | Pisahkan koma; prod: domain Vercel |
| `STORAGE_DRIVER` | `supabase` \| `local` | |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | (secret) | **Hanya di server**; jangan ke FE |
| `SUPABASE_BUCKET` | `attachments` | Bucket private |
| `MAX_ATTACHMENT_MB` | `4` | AS-12 |
| `SEED_ADMIN_PASSWORD` | `Admin12345` | Opsional override seed |
| `SEED_OPERATOR_PASSWORD` | `Operator12345` | Opsional override seed |

### `apps/web/.env.local`
| Variabel | Contoh | Keterangan |
|---|---|---|
| `API_URL` | `http://localhost:4000` | Target rewrite (server-side). Prod: URL Render |
| `NEXT_PUBLIC_APP_NAME` | `Aplikasi Pengelolaan Barang` | Opsional |

`next.config.ts` (rewrite same-origin):
```ts
async rewrites() {
  return [{ source: '/api/:path*', destination: `${process.env.API_URL}/api/v1/:path*` }];
}
```
> Env divalidasi saat boot (Zod). Variabel kurang → aplikasi gagal start dengan pesan jelas.

---

## 4. Skrip (root `package.json`)

| Perintah | Fungsi |
|---|---|
| `npm run dev` | web + api (watch); `predev` membangun `@jmc/shared` lebih dulu |
| `npm run build` | build shared → api → web |
| `npm run lint` / `npm run typecheck` / `npm test` | Kualitas (dijalankan di semua workspace yang punya skrip tsb.) |
| `npm run test:e2e` | e2e API (butuh DB test) |
| `npm run db:migrate` | Migrasi lokal (`prisma migrate dev`) |
| `npm run db:deploy` | Migrasi produksi (`prisma migrate deploy`) |
| `npm run db:seed` | Seed (`prisma db seed`) |
| `npm run db:studio` | Lihat data (`prisma studio`) |

### 4.1 Berkas konfigurasi root (acuan M0.1)

`package.json`
```json
{
  "name": "jmc-barang",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "engines": { "node": ">=22", "npm": ">=10" },
  "scripts": {
    "predev": "npm run build -w @jmc/shared",
    "dev": "concurrently -k -n api,web -c blue,green \"npm run dev -w @jmc/api\" \"npm run dev -w @jmc/web\"",
    "build": "npm run build -w @jmc/shared && npm run build -w @jmc/api && npm run build -w @jmc/web",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm test --workspaces --if-present",
    "test:e2e": "npm run test:e2e -w @jmc/api",
    "db:migrate": "npm run prisma:migrate -w @jmc/api",
    "db:deploy": "npm run prisma:deploy -w @jmc/api",
    "db:seed": "npm run prisma:seed -w @jmc/api",
    "db:studio": "npm run prisma:studio -w @jmc/api"
  },
  "devDependencies": { "concurrently": "9.x.x" }
}
```
> Pin versi exact saat inisialisasi (`.npmrc` → `save-exact=true`); nilai `9.x.x` hanya penanda. Di `apps/api/package.json` definisikan `prisma:migrate` = `prisma migrate dev`, `prisma:deploy` = `prisma migrate deploy`, `prisma:seed` = `prisma db seed`, `prisma:studio` = `prisma studio`, `prisma:generate` = `prisma generate`. Taruh paket `prisma` (CLI) di `dependencies` api agar `migrate deploy` tetap tersedia saat start di produksi.

`.npmrc`
```
save-exact=true
engine-strict=true
```
`.nvmrc` → `22`

Dependensi internal (di `apps/api/package.json` & `apps/web/package.json`): `"@jmc/shared": "*"`. `packages/shared` perlu `main`/`types`/`exports` menunjuk ke `dist` hasil build.

### 4.2 CI (GitHub Actions)
`.github/workflows/ci.yml`
```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build -w @jmc/shared
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

---

## 5. Deployment

> Batas & perilaku free tier dapat berubah. **Cek dokumentasi resmi Vercel/Render/Supabase sebelum deploy.**

### 5.1 Supabase
1. Buat proyek → catat **Connection string**: *Direct* (`DIRECT_URL`) dan *Pooler/Transaction* (`DATABASE_URL`, tambahkan `?pgbouncer=true&connection_limit=1`).
2. Storage → buat bucket `attachments` bertipe **Private**.
3. Ambil `SUPABASE_URL` & `service_role` key (rahasia).
4. Jalankan migrasi sekali dari lokal bila perlu (Git Bash): `DIRECT_URL=... DATABASE_URL=... npm run db:deploy`, lalu `npm run db:seed` dengan env yang sama.

### 5.2 Render (API)
| Pengaturan | Nilai |
|---|---|
| Type | Web Service (Node) |
| Root Directory | repo root (monorepo) |
| Build Command | `npm ci --include=dev && npm run build -w @jmc/shared && npm run prisma:generate -w @jmc/api && npm run build -w @jmc/api` |
| Start Command | `npm run db:deploy && node apps/api/dist/main.js` |
| Health Check Path | `/api/v1/health` |
| Env | Semua variabel `apps/api/.env` (production) |

Catatan: set env `NODE_VERSION=22` di Render (atau biarkan membaca `.nvmrc`). `--include=dev` wajib karena Render men-set `NODE_ENV=production` sehingga `npm ci` biasa akan melewatkan devDependencies (TypeScript, Nest CLI) yang dibutuhkan saat build. Nama workspace (`@jmc/shared`, `@jmc/api`, `@jmc/web`) harus sama dengan `name` di masing-masing `package.json`. Service gratis dapat tertidur saat idle → lihat §5.4.

### 5.3 Vercel (Web)
| Pengaturan | Nilai |
|---|---|
| Root Directory | `apps/web` (aktifkan *include files outside root* agar `packages/shared` ikut) |
| Install Command | `cd ../.. && npm ci` (dari root monorepo) |
| Build Command | `cd ../.. && npm run build -w @jmc/shared && npm run build -w @jmc/web` |
| Env | `API_URL` = URL Render (tanpa slash akhir) |

Setelah deploy, tambahkan domain Vercel ke `CORS_ORIGINS` di Render.

### 5.4 Keep-alive (ADR-10)
`.github/workflows/keepalive.yml`
```yaml
name: keepalive
on:
  schedule: [{ cron: "*/10 * * * *" }]
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS --max-time 60 "${{ secrets.API_HEALTH_URL }}" || true
```
Set secret `API_HEALTH_URL` = `https://<api>.onrender.com/api/v1/health`. Alternatif: UptimeRobot (interval 5 menit). `/health` menjalankan `SELECT 1` sehingga DB juga tetap aktif.
Sebelum submit & merekam video: buka `/health` dan halaman login untuk memastikan semuanya hangat.

---

## 6. Akun Pengujian (cantumkan di README)

| Role | Username | Password |
|---|---|---|
| Admin | `administrator` | `Admin12345` |
| Operator | `operator1` | `Operator12345` |
| Operator | `operator2` | `Operator12345` |
| Operator (locked, demo) | `operator3` | `Operator12345` |

> Hanya untuk demo/penilaian. Jangan memakai kredensial ini untuk sistem nyata.

---

## 7. Template README.md (wajib)

```markdown
# Aplikasi Pengelolaan Barang — PT JMC Indonesia

🔗 **Live App:** https://<app>.vercel.app
🎬 **Video Demo:** https://<link-video>

## Tech Stack
- Frontend: Next.js (React), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form + Zod
- Backend: NestJS (TypeScript), Prisma, JWT (httpOnly cookie)
- Database: PostgreSQL (Supabase) · Storage: Supabase Storage
- Deploy: Vercel (web) · Render (api) · Supabase (db)

## Akun Pengujian
| Role | Username | Password |
| ... |

## Instalasi Lokal
(salin §2 dokumen SETUP)

## Dokumentasi
docs/PRD.md · API_SPEC.md · ARCHITECTURE.md · DATABASE_SCHEMA.md · DESIGN.md · ROADMAP.md
Swagger: <api>/api/docs
```

---

## 8. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `prepared statement "s0" already exists` | Pooler tanpa mode pgbouncer | Tambah `?pgbouncer=true` pada `DATABASE_URL` |
| Migrasi gagal/`hang` di Supabase | Memakai URL pooler untuk migrasi | Gunakan `DIRECT_URL` |
| Login sukses tapi langsung logout | Cookie `Secure` pada HTTP / domain berbeda | Dev: `COOKIE_SECURE=false`; Prod: pastikan akses lewat domain Vercel (proxy) |
| 401 di semua request prod | `JWT_SECRET` beda antar deploy / `trust proxy` belum aktif | Samakan secret; aktifkan `app.set('trust proxy', 1)` |
| Request pertama sangat lambat | Cold start free tier | Keep-alive §5.4 |
| Upload 413/gagal di prod | Batas body hosting | Pastikan file ≤ 4 MB; cek log Render/Vercel |
| `Cannot find module '@jmc/shared'` | Shared belum di-build, atau dependensi `"@jmc/shared": "*"` belum ditambahkan / `npm ci` belum dijalankan di root | `npm ci` lalu `npm run build -w @jmc/shared` |
| `npm error code EBADENGINE` | Versi Node/npm di luar `engines` | Pakai Node ≥ 22 (`nvm use` membaca `.nvmrc`) |
| `npm error code EUNSUPPORTEDPROTOCOL` (`workspace:`) | Memakai sintaks pnpm `workspace:*` | Ganti dengan `"@jmc/shared": "*"` |
| `docker compose` gagal konek / port 5432 terpakai | Docker Desktop belum aktif atau ada Postgres lokal lain | Jalankan Docker Desktop; hentikan Postgres lain atau ubah port mapping (mis. `5433:5432`) dan sesuaikan `DATABASE_URL` |
| Skrip/`.env` error `\r: command not found` di Windows | Akhir baris CRLF | `.gitattributes`: `* text=auto eol=lf`, lalu checkout ulang |
| Export kosong | Filter/scope tak sesuai | Bandingkan `where` dengan list (BR-20) |
| Tahun filter salah di 31 Des/1 Jan | Batas tahun UTC | Pakai rentang WIB (+07:00) |
