# DESIGN.md — UI/UX & Design System

Acuan visual: mockup pada PDF soal (layout dengan sidebar gelap + konten terang). Warna di bawah adalah **perkiraan visual** dari mockup; boleh disesuaikan selama konsisten.

---

## 1. Prinsip
1. **Mirip mockup**: struktur halaman, urutan kolom, dan penempatan kontrol harus sama.
2. **Cepat dipindai**: tabel padat tapi terbaca; status & aksi jelas.
3. **Aman secara default**: aksi destruktif selalu konfirmasi; tombol nonaktif disertai tooltip alasan.
4. **Selalu ada umpan balik**: loading, kosong, error, sukses (toast).
5. **Bahasa Indonesia** untuk semua teks UI.

---

## 2. Design Tokens (Tailwind / CSS variables)

| Token | Nilai (≈) | Pemakaian |
|---|---|---|
| `--primary` | `#337DA0` | Tombol utama, menu aktif, halaman aktif pada paging, link |
| `--primary-foreground` | `#FFFFFF` | Teks di atas primary |
| `--sidebar-bg` | `#1B2638` | Sidebar |
| `--sidebar-fg` | `#C9D1DE` | Teks menu non-aktif |
| `--bg` | `#F4F6FA` | Latar halaman |
| `--surface` | `#FFFFFF` | Kartu/tabel/modal |
| `--border` | `#E4E8EF` | Garis tabel & input |
| `--text` | `#1F2937` | Teks utama |
| `--muted` | `#6B7280` | Header tabel, hint |
| `--success` | `#22A06B` | Ikon verifikasi, toast sukses |
| `--danger` | `#E5484D` | Hapus, error, total melebihi batas |
| `--warning` | `#B7791F` | Peringatan (mis. upload lampiran gagal) |
| `--radius` | `6px` | Kartu & input; tombol `6px` |
| Font | Inter (via `next/font`), fallback system-ui | Ukuran dasar 14px; header tabel 11px uppercase `letter-spacing:.04em` |
| Bayangan | `0 1px 2px rgba(16,24,40,.06)` | Kartu |

Kontras teks vs latar ≥ 4.5:1. Fokus: ring 2px `--primary` offset 2px.

---

## 3. Layout Aplikasi (setelah login)

```
┌─────────────┬─────────────────────────────────────────────┐
│ [Logo] Aplikasi Pengelolaan Barang │ ☰            [AD] Admin ▾ │  ← Topbar (tinggi 56px)
│ Sidebar 240px                      │ Breadcrumb: HOME / BARANG MASUK    │
│ ▸ Barang Masuk                     │ Judul halaman                      │
│ ▾ Master Data                      │ ┌───────── Card ───────────────┐  │
│    ├ Kategori                      │ │ toolbar + tabel + paging     │  │
│    └ Sub Kategori                  │ └──────────────────────────────┘  │
│ ▸ Manajemen User                   │                                    │
└─────────────┴─────────────────────────────────────────────┘
```
- **Sidebar**: latar `--sidebar-bg`; item aktif = pill `--primary`; *Master Data* dapat expand/collapse dengan sub-menu. Operator hanya melihat **Barang Masuk** (AS-14: tanpa lonceng).
- **Topbar**: tombol hamburger (collapse sidebar; di <1024px sidebar menjadi drawer). Kanan: avatar inisial + nama + role ("Administrator"/"Operator") dengan dropdown berisi **Logout**.
- **Breadcrumb** huruf kapital kecil `HOME / MASTER DATA / KATEGORI`; judul halaman di bawahnya.
- Konten di dalam kartu putih, radius 6px, padding 16–20px.

---

## 4. Halaman Login
- Dua kolom: kiri form (lebar ≈ 360px, tengah vertikal), kanan gambar gudang (sembunyikan <768px).
- Isi kiri: logo + "**Aplikasi Pengelolaan Barang**" / "PT JMC Indonesia"; judul "LOGIN" (primary, bold); teks "Selamat Datang, silahkan masukkan username dan password anda!"; input Username & Password (toggle tampil password); tombol penuh **MASUK**.
- Gambar: gunakan foto/ilustrasi gudang **berlisensi bebas (mis. Unsplash/ilustrasi sendiri)** — jangan menyalin gambar dari dokumen soal.
- Error ditampilkan di atas tombol (alert merah): "Username atau password salah." / "Akun Anda dikunci. Hubungi administrator."
- Tombol memuat state `loading` (spinner + teks "Memproses…"); bila >3 s tampilkan "Menghubungkan ke server, mohon tunggu…" (cold start).
- Enter pada field = submit. Fokus awal di Username.

---

## 5. Pola Tabel Daftar (semua modul)

| Elemen | Spesifikasi |
|---|---|
| Toolbar | Kiri: tombol **+ Tambah Data** (primary). Kanan: filter (select) → search input (placeholder "Cari data..") + ikon cari |
| Header | Teks 11px uppercase `--muted`; kolom sortable memberi ikon panah & `aria-sort` |
| Baris | Tinggi 44px, hover `#F8FAFC`; nomor urut kontinu lintas halaman (`(page-1)*10 + i`) |
| Kolom ACTION | Ikon: pensil (edit), tempat sampah merah (hapus); Barang Masuk + ikon cetak; User + ikon gembok |
| Paging | Kanan-bawah: `‹ 1 2 3 4 5 next ›` seperti mockup; halaman aktif = kotak `--primary` putih; jendela 5 halaman |
| Loading | 10 baris skeleton |
| Kosong | Ikon + "Belum ada data" (+ "Tidak ada hasil untuk 'xxx'" bila sedang search) |
| Error | Alert + tombol **Coba lagi** |
| Tooltip | Semua ikon aksi punya `title`/tooltip + `aria-label` |

Hapus → `ConfirmDialog`: "Hapus data ini? Tindakan tidak dapat dibatalkan." [Batal] [Hapus (merah)]. Kegagalan 409 ditampilkan sebagai toast error dengan pesan server.

---

## 6. Halaman per Modul

### 6.1 Barang Masuk — daftar
- Toolbar: **+ Tambah Data** | Select *Semua Kategori* | Select *Semua Sub Kategori* (nonaktif sampai kategori dipilih atau menampilkan semua; opsi mengikuti kategori) | Select *Semua Tahun* | Search | tombol **Export Excel** (ikon unduh) — tombol export baru ada dibanding mockup; tempatkan di kiri filter.
- Kolom: `NO · ACTION · TANGGAL · ASAL BARANG · PENERIMA · UNIT · KODE · NAMA · HARGA (RP.) · JUMLAH · TOTAL (RP.) · STATUS`.
- **Grup baris**: kolom NO–UNIT & STATUS memakai `rowSpan = jumlah item`; kolom KODE–TOTAL satu baris per item; item (sub-baris) memakai latar abu muda `#F3F4F6` selang-seling seperti mockup. Harga/Total rata kanan, `JUMLAH` = `"4 Rim"`.
- Tanggal `dd/MM/yy HH:mm:ss` (WIB). Sort pada header **TANGGAL**, **ASAL BARANG**, **TOTAL (RP.)**.
- **STATUS**: tombol ikon lingkaran-centang. Belum = abu outline; terverifikasi = hijau `--success`. Admin: klik → toggle (konfirmasi ringan "Tandai terverifikasi?"). Operator: tampil sebagai ikon saja (tidak interaktif, tooltip "Hanya Admin yang dapat memverifikasi").
- Edit/Hapus pada data terverifikasi: nonaktif + tooltip "Data sudah terverifikasi".
- Ikon cetak → membuka PDF di tab baru (`fetch` blob → `window.open(objectURL)`).
- Ganti Kategori → reset Sub Kategori & `page=1`.

### 6.2 Barang Masuk — form tambah/edit (halaman penuh)
Dua kartu seperti mockup:

**INFORMASI UMUM** (grid 2 kolom di ≥1024px)
- Operator (select; terkunci/disabled untuk Operator), Kategori, Sub Kategori + **Batas Harga** (readonly, latar abu, `Rp 500.000`), Asal Barang (lebar penuh), Nomor Surat, Lampiran (input file + tampilkan nama/ukuran berkas terpasang, tombol Hapus & Unduh saat edit).

**INFORMASI BARANG** — header kolom: `Nama Barang · Harga (Rp.) · Jumlah · Satuan · Total · Tgl. Ekspired · [aksi]`
- Satu baris = 1 item. Aksi: baris pertama tombol **+** (outline primary, bulat); baris berikutnya tombol **×** (merah, bulat). Baris tunggal tidak dapat dihapus. Maks 50.
- Total: readonly, awalan "Rp.", rata kanan. Harga dengan `RupiahInput`.
- **Ringkasan batas harga** di bawah baris: `Total keseluruhan: Rp 344.000 / Batas: Rp 500.000` — hijau bila ≤ batas, merah + ikon peringatan bila melebihi, plus pesan: "Total harga (Rp 600.000) melebihi batas harga sub kategori (Rp 500.000)."
- Footer form: **← Kembali** (secondary) dan **Simpan** (primary, loading saat submit). Navigasi keluar dengan perubahan belum disimpan → konfirmasi.
- Validasi: saat `blur` + saat submit (mode `onTouched`); fokus otomatis ke field error pertama.
- Setelah sukses: toast "Data berhasil disimpan", kembali ke daftar (filter di URL dipertahankan).

### 6.3 Master Data > Kategori
Tabel: `NO · ACTION · KODE · NAMA KATEGORI`. Modal "Form": Kode Kategori (input pendek, uppercase otomatis), Nama Kategori; tombol **Close** (abu) & **Submit** (primary). Error duplikat tampil di bawah field Kode.

### 6.4 Master Data > Sub Kategori
Tabel: `NO · ACTION · KATEGORI BARANG · SUB KATEGORI BARANG · BATAS HARGA (RP)` (kolom terakhir rata kanan). Modal: Kategori (select, placeholder "Pilih Kategori"), Nama Sub Kategori, Batas Harga (`RupiahInput`, placeholder `0`).

### 6.5 Manajemen User
Toolbar: **+ Tambah Data** | Select *Semua Role* | Search. Kolom: `NO · ACTION · USERNAME · NAMA · EMAIL · ROLE`. User locked: ikon gembok tertutup berwarna `--danger` + lencana "Terkunci" di samping username. Aksi untuk diri sendiri: hapus & gembok nonaktif (BR-05). Modal: Role, Username, Password (saat edit: placeholder "Kosongkan jika tidak diubah"), Nama, Email.

---

## 7. Komponen Bersama (`apps/web/src/components/shared`)

| Komponen | Catatan perilaku |
|---|---|
| `DataTable` | Props: kolom, data, `isLoading`, `sort`, `onSortChange`; mendukung `rowSpan` grup untuk Barang Masuk |
| `Pagination` | Terkontrol dari URL; menyembunyikan diri bila `totalPages <= 1` |
| `SearchInput` | Debounce 400 ms; tombol Enter memicu langsung; tombol bersihkan |
| `RupiahInput` | Terima/emit `number | null`; tampil `1.234.567`; hanya digit; paste dibersihkan; caret tidak melompat; rata kanan; prefix "Rp." visual |
| `ConfirmDialog` | Radix AlertDialog; fokus ke tombol aman (Batal) |
| `FormField` | Label, kontrol, pesan error `role="alert"`, `aria-invalid`, `aria-describedby` |
| `StatusToggle` | Tombol ikon dengan state `verified/unverified/readonly` |
| `PriceLimitSummary` | Menampilkan total vs batas, warna sesuai state |
| `EmptyState`, `ErrorState`, `TableSkeleton` | Pola status |
| `PageHeader` | Breadcrumb + judul + slot aksi |

---

## 8. Responsif & Aksesibilitas
- Prioritas desktop ≥1280px; ≥1024px nyaman; <1024px sidebar → drawer; tabel dibungkus `overflow-x:auto`; grid form 2 kolom → 1 kolom di <768px.
- Semua kontrol bisa dioperasikan keyboard; modal menjebak fokus & menutup dengan `Esc`; ikon-saja wajib `aria-label`.
- Status tidak hanya berbasis warna (ikon + teks tooltip).
- Hormati `prefers-reduced-motion`.

---

## 9. Copywriting (`lib/messages.ts`)

| Kunci | Teks |
|---|---|
| `required` | "Wajib diisi" |
| `maxLength(n)` | "Maksimal {n} karakter" |
| `lengthRange(a,b)` | "Harus {a}–{b} karakter" |
| `emailInvalid` | "Format email tidak valid" |
| `passwordPolicy` | "Password harus mengandung huruf besar, huruf kecil, dan angka" |
| `duplicate.code` | "Kode sudah digunakan" |
| `duplicate.username` | "Username sudah digunakan" |
| `priceLimitExceeded` | "Total harga (Rp {total}) melebihi batas harga sub kategori (Rp {limit})" |
| `fileInvalid` | "Lampiran harus berformat doc, docx, atau zip (maks 4 MB)" |
| `saveOk` | "Data berhasil disimpan" |
| `deleteOk` | "Data berhasil dihapus" |
| `inUse` | "Data tidak dapat dihapus karena sedang digunakan" |
| `loginFailed` | "Username atau password salah" |
| `accountLocked` | "Akun Anda dikunci. Hubungi administrator." |
| `forbidden` | "Anda tidak memiliki akses ke halaman ini" |
| `serverSlow` | "Menghubungkan ke server, mohon tunggu…" |
| `unexpected` | "Terjadi kesalahan. Silakan coba lagi." |

Format angka: `Intl.NumberFormat('id-ID')`. Tanggal: `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta' })`.

---

## 10. Checklist Kualitas UI (untuk agent sebelum menandai selesai)
- [ ] Kolom & urutan tabel sesuai §6
- [ ] Empty/Loading/Error ada di setiap tabel
- [ ] Semua aksi destruktif ada konfirmasi
- [ ] Field wajib berlabel & pesan error Indonesia sesuai §9
- [ ] RupiahInput: ketik, hapus, paste, caret aman
- [ ] Keyboard-only: login → tambah transaksi → simpan bisa dilakukan
- [ ] Tidak ada teks Inggris yang bocor ke UI
