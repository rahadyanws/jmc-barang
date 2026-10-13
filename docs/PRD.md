# PRD — Aplikasi Pengelolaan Barang (PT JMC Indonesia)

| | |
|---|---|
| Versi | 1.0 |
| Level | Medium (kualitas target: Senior) |
| Status | Source of truth kebutuhan. Perubahan wajib dicatat di §12 |

---

## 1. Ringkasan Produk

Aplikasi web untuk mencatat transaksi **Barang Masuk**, mengelompokkan barang dalam **Kategori** dan **Sub Kategori**, serta membatasi nilai transaksi sesuai **Batas Harga** per Sub Kategori. Akses dibedakan oleh role **Admin** dan **Operator**.

### 1.1 Tujuan
- G1: Pencatatan Barang Masuk yang valid (total ≤ batas anggaran) dan dapat ditelusuri.
- G2: Pengelolaan master data & user oleh Admin.
- G3: Pelaporan sederhana: filter, search, sort, export Excel, cetak surat masuk.
- G4 (penilaian test): kode bersih, aman, teruji, terdeploy, terdokumentasi.

### 1.2 Non-Goals
Registrasi mandiri, lupa password, notifikasi (ikon lonceng), multi-gudang, stok keluar, laporan grafik, multi-bahasa, mobile app native.

### 1.3 Glosarium
| Istilah | Arti |
|---|---|
| Barang Masuk | Satu transaksi penerimaan barang (header + banyak item) |
| Asal Barang | Pemasok/sumber barang (teks bebas, mis. "PT. Sidomakmur") |
| Penerima | Operator yang menerima barang (= field *Operator* di form) |
| Batas Harga | Plafon nilai total transaksi per Sub Kategori (Rupiah) |
| Surat Masuk | Dokumen cetak (PDF) untuk satu transaksi Barang Masuk |
| Verifikasi | Penanda Admin bahwa data sudah benar (ikon centang hijau) |

---

## 2. Pengguna & Hak Akses (RBAC)

| Modul / Aksi | Admin | Operator |
|---|:-:|:-:|
| Login / Logout | ✔ | ✔ |
| Barang Masuk — lihat daftar | ✔ semua | ✔ **milik sendiri** (AS-06) |
| Barang Masuk — tambah | ✔ (pilih Operator) | ✔ (Operator terkunci diri sendiri) |
| Barang Masuk — edit / hapus | ✔ | ✔ milik sendiri & belum terverifikasi |
| Barang Masuk — toggle verifikasi | ✔ | ✖ (hanya melihat status) (AS-05) |
| Barang Masuk — export Excel / cetak | ✔ | ✔ (dalam cakupan data yang boleh dilihat) |
| Master Data > Kategori (CRUD) | ✔ | ✖ |
| Master Data > Sub Kategori (CRUD) | ✔ | ✖ |
| Manajemen User (CRUD, lock/unlock) | ✔ | ✖ |
| Dropdown Kategori/Sub Kategori (read-only options) | ✔ | ✔ |

Menu sidebar Operator hanya menampilkan **Barang Masuk**. Akses langsung ke URL terlarang → halaman 403 (FE) dan `403 FORBIDDEN` (API).

---

## 3. Spesifikasi Modul

### 3.1 Login
- Halaman awal; semua halaman lain butuh login.
- Field: Username (wajib), Password (wajib). Tombol **MASUK**.
- User *locked* tidak bisa login (pesan khusus, hanya ditampilkan setelah kredensial benar).
- Setelah login → `/barang-masuk`. Logout lewat dropdown profil (kanan atas).

### 3.2 Barang Masuk
**Tabel (satu transaksi = satu grup baris, item sebagai sub-baris):**
`NO · ACTION · TANGGAL · ASAL BARANG · PENERIMA · UNIT · KODE · NAMA · HARGA (RP.) · JUMLAH · TOTAL (RP.) · STATUS`

| Fitur | Rincian |
|---|---|
| Paging | 10 transaksi / halaman |
| Filter | Kategori; Sub Kategori (opsi mengikuti Kategori terpilih); Tahun |
| Search | `Asal Barang` atau nama `Sub Kategori` (contains, case-insensitive) |
| Sort | Tanggal, Asal Barang, Total Harga (asc/desc). Default: Tanggal desc |
| Export Excel | Sesuai filter + search + sort aktif; format kolom = tabel (BR-20) |
| Cetak | Ikon cetak per baris → PDF "Surat Barang Masuk" |
| Status | Toggle ikon centang hijau = terverifikasi |
| Action | Edit (pensil), Cetak, Hapus (tempat sampah) |

**Form Tambah/Edit** (halaman penuh, bukan modal)

*Informasi Umum*

| Field | Tipe | Aturan |
|---|---|---|
| Operator | Combobox | Admin: pilih dari user ber-role Operator (wajib). Operator: terkunci pada dirinya (BR-10) |
| Kategori | Combobox | Wajib. UI-only; kategori diturunkan dari Sub Kategori |
| Sub Kategori | Combobox | Wajib. Opsi hanya milik Kategori terpilih (BR-11) |
| Batas Harga | Text readonly | Otomatis dari Sub Kategori, format Rupiah |
| Asal Barang | Textbox | Wajib, maks 200 |
| Nomor Surat | Textbox | Opsional, maks 100 |
| Lampiran | File | Opsional; `.doc/.docx/.zip`; maks 4 MB (AS-12) |

*Informasi Barang (baris dinamis, min 1, maks 50)*

| Field | Tipe | Aturan |
|---|---|---|
| Nama Barang | Textbox | Wajib, maks 200 |
| Harga (Rp.) | Textbox + masking | Wajib, integer ≥ 1, tampil `1.234.567` |
| Jumlah | Textbox numerik | Wajib, integer ≥ 1 (AS-08) |
| Satuan | Textbox | Wajib, maks 40 |
| Total | Readonly | `Harga × Jumlah` otomatis |
| Tgl Expired | Date | Opsional; bila diisi ≥ tanggal transaksi (AS-11) |
| `+` / `x` | Button | Tambah baris / hapus baris (min 1 baris tersisa) |

**Validasi kritis:** `Σ Total item ≤ Batas Harga Sub Kategori` (BR-13). Ditampilkan live di form (mis. "Total Rp 600.000 / Batas Rp 500.000" merah) dan divalidasi ulang oleh server.

### 3.3 Master Data > Kategori
Tabel: NO · ACTION · KODE · NAMA KATEGORI. Paging 10, search kode/nama. Form **modal**: Kode Kategori (wajib, unik, maks 10), Nama Kategori (wajib, maks 100).

### 3.4 Master Data > Sub Kategori
Tabel: NO · ACTION · KATEGORI BARANG · SUB KATEGORI BARANG · BATAS HARGA (RP). Paging 10, search nama kategori/sub kategori. Form **modal**: Kategori (combobox wajib), Nama Sub Kategori (wajib, maks 100), Batas Harga (wajib, Rupiah, masking, integer ≥ 1).

### 3.5 Manajemen User
Tabel: NO · ACTION · USERNAME · NAMA · EMAIL · ROLE. Paging 10, filter Role, search username/nama. Action: Edit, **Lock/Unlock** (ikon gembok), Hapus. Form **modal**:

| Field | Aturan |
|---|---|
| Role | Combobox wajib: Admin / Operator |
| Username | Wajib, unik, 8–100 karakter |
| Password | Wajib (saat tambah), 8–100, minimal 1 huruf besar + 1 huruf kecil + 1 angka |
| Nama | Wajib, 8–100 karakter |
| Email | Wajib, 8–100, format email valid |

---

## 4. Matriks Validasi Terpusat

Satu sumber di `packages/shared/src/constants.ts` (dipakai FE & BE). Nilai: lihat tabel field di §3; konstanta tambahan: `MAX_ITEMS=50`, `MAX_ATTACHMENT_MB=4`, `PAGE_SIZE=10`, `MAX_EXPORT_ROWS=10000`, `MAX_MONEY=999_999_999_999`.

---

## 5. Asumsi & Keputusan (AS-xx)

Soal asli tidak menjelaskan beberapa hal. Keputusan berikut **mengikat** sampai diubah di dokumen ini.

| ID | Keputusan | Alasan |
|---|---|---|
| AS-01 | Kolom tabel **Penerima** = nama Operator transaksi | Form hanya punya Operator |
| AS-02 | Kolom **Unit** = konstanta `"Gudang Utama"` (kolom DB `unit`, default; tidak ada input) | Ada di tabel, tidak ada di form |
| AS-03 | Kolom **Kode** = kode barang auto: `{KODE_KATEGORI}{NNNN}` (urut per kategori, unik, stabil saat edit) | Ada di tabel, tidak ada di form |
| AS-04 | **Tanggal** = waktu server saat dibuat (`timestamptz`), tampil WIB `dd/MM/yy HH:mm:ss`, tidak dapat diedit | Form tidak punya field tanggal |
| AS-05 | Hanya **Admin** yang boleh toggle verifikasi | Pemisahan tugas (segregation of duties) |
| AS-06 | Operator hanya melihat/mengelola transaksi miliknya | Field Operator terkunci pada dirinya |
| AS-07 | Transaksi **terverifikasi** tidak bisa diedit/dihapus sampai di-*unverify* Admin | Integritas data |
| AS-08 | Jumlah & Harga = bilangan bulat ≥ 1 | Rupiah tanpa desimal; hindari float |
| AS-09 | Aturan panjang minimum 8 (Username, Nama, Email) diikuti persis; data seed dibuat mematuhinya. Contoh mockup (`admin`, `joko`, `Budi`) dianggap ilustrasi | Spec eksplisit; lihat OQ-02 |
| AS-10 | Edit user: password **opsional** (kosong = tidak diubah) | Praktik umum |
| AS-11 | Tgl Expired (bila diisi) ≥ tanggal transaksi (hari, WIB) | Masuk akal secara bisnis |
| AS-12 | Lampiran maks 4 MB; ekstensi `.doc/.docx/.zip`; cek MIME + magic bytes | Aman + di bawah batas body proxy hosting (konservatif) |
| AS-13 | Username & email disimpan **lowercase**; Kode Kategori **UPPERCASE**; keunikan efektif case-insensitive | Hindari duplikat semu |
| AS-14 | Ikon lonceng notifikasi **tidak dirender** | Di luar spesifikasi |
| AS-15 | Batas Harga bersifat **inklusif** (`total ≤ batas`) | "tidak boleh melebihi" |
| AS-16 | Perubahan Batas Harga **tidak retroaktif**; edit transaksi divalidasi vs batas **terkini**; nilai batas saat simpan disimpan sebagai `priceLimitSnapshot` | Histori tetap konsisten |
| AS-17 | Paging = 10 transaksi/halaman (bukan 10 item) | Tabel mengelompokkan item per transaksi |
| AS-18 | Export: 1 baris per item; kolom header transaksi di-merge vertikal; kolom Jumlah ditulis `"4 Rim"` seperti tabel; maks 10.000 transaksi | "format sesuai tabelview" |
| AS-19 | Cetak Surat = PDF di server (`pdfmake`), 1 transaksi | Konsisten, tanpa headless browser |
| AS-20 | Seed menyediakan ≥ 25 transaksi agar paging/filter dapat didemokan | Kebutuhan demo/penilaian |

---

## 6. Business Rules (BR-xx)

| ID | Aturan |
|---|---|
| BR-01 | Semua endpoint butuh autentikasi, kecuali `POST /auth/login` & `GET /health` |
| BR-02 | User `locked` tidak bisa login; kunci berlaku **segera** (status dicek ke DB tiap request) |
| BR-03 | Password 8–100, ≥1 huruf besar, ≥1 huruf kecil, ≥1 angka; di-hash `argon2id`; tak pernah dikembalikan |
| BR-04 | Username & email unik (case-insensitive) |
| BR-05 | Admin tidak boleh mengunci/menghapus **dirinya sendiri**; harus selalu ada ≥1 Admin aktif (tidak locked) |
| BR-06 | Kode Kategori unik (maks 10); Nama maks 100 |
| BR-07 | Kategori yang masih punya Sub Kategori **tidak dapat dihapus** (`409 CONFLICT_IN_USE`) |
| BR-08 | Sub Kategori yang dipakai Barang Masuk **tidak dapat dihapus** |
| BR-09 | User yang punya transaksi **tidak dapat dihapus** (saran: Lock) |
| BR-10 | Operator pada transaksi: Admin memilih; untuk Operator server **memaksa** = user login |
| BR-11 | Sub Kategori harus milik Kategori yang dipilih (di form, filter, dan validasi server) |
| BR-12 | `lineTotal = unitPrice × quantity` dihitung **server**; nilai client diabaikan |
| BR-13 | `Σ lineTotal ≤ subCategory.priceLimit` → jika dilanggar `422 PRICE_LIMIT_EXCEEDED` |
| BR-14 | Minimal 1 item, maksimal 50 item per transaksi |
| BR-15 | Item dengan `id` = update; tanpa `id` = baru (kode auto); item yang hilang dari payload = dihapus |
| BR-16 | `transactionDate` immutable |
| BR-17 | Verifikasi hanya Admin; transaksi terverifikasi terkunci (`409 RECORD_VERIFIED_LOCKED`) |
| BR-18 | Operator hanya akses transaksi miliknya (`404` bila bukan miliknya — tidak membocorkan keberadaan) |
| BR-19 | Lampiran: `.doc/.docx/.zip`, ≤4 MB, MIME & magic bytes valid, nama file disanitasi, disimpan private |
| BR-20 | Export menggunakan `where/orderBy` **identik** dengan list (tanpa paging) |
| BR-21 | Kode barang auto-generate atomik (counter per kategori), unik global |
| BR-22 | Paging default & tetap 10 (`pageSize` ≤ 50 hanya untuk keperluan teknis) |
| BR-23 | Simpan header + items + (total, snapshot) dalam **satu transaksi DB** |
| BR-24 | Mata uang integer Rupiah; tampil format `id-ID` |

---

## 7. Non-Functional Requirements

| Area | Target |
|---|---|
| Performa | List Barang Masuk p95 < 500 ms pada 10.000 transaksi (server aktif/warm) |
| Keamanan | OWASP ASVS dasar: hash kuat, cookie `httpOnly/Secure/SameSite`, rate limit login (5/menit/IP+username), `helmet`, validasi input, tidak ada SQL mentah tanpa parameter, CORS allowlist, cek `Origin` untuk mutasi |
| Reliabilitas | `/health` mengecek koneksi DB; transaksi DB atomik |
| Usability | Responsif ≥ 1024px prioritas; tablet didukung; keyboard-friendly |
| Aksesibilitas | Label form, `aria-invalid`, fokus terlihat, kontras ≥ 4.5:1 |
| Observabilitas | Log terstruktur (pino), `requestId`, tanpa data sensitif |
| Maintainability | Lint+typecheck+test di CI, cakupan test aturan bisnis kritis |
| Kompatibilitas | Chrome/Edge/Firefox/Safari terbaru |

---

## 8. Acceptance Criteria (AC-xx)

**AC-01 Login & Lock**
- *Given* user aktif, *When* kredensial benar, *Then* masuk ke Barang Masuk.
- *Given* user locked & password benar, *Then* `403 ACCOUNT_LOCKED`, tidak ada sesi.
- *Given* user sedang login lalu di-lock Admin, *When* ia memanggil API apa pun, *Then* `403/401` dan diarahkan ke login.

**AC-02 RBAC**
- Operator membuka `/manajemen-user` → 403. Operator `GET /users` → `403 FORBIDDEN`.
- Operator tidak melihat transaksi operator lain (`GET /incoming-goods/{id}` milik lain → `404`).

**AC-03 Batas Harga**
- *Given* Sub Kategori batas 500.000, *When* total item 500.000, *Then* tersimpan.
- *When* total 500.001, *Then* `422 PRICE_LIMIT_EXCEEDED` dengan `details.limit/total/excess`; FE menampilkan pesan & tidak menyimpan.
- *When* Sub Kategori diganti ke batas lebih kecil dan total kini melebihi, *Then* error live di form.

**AC-04 Form dinamis**
- Tombol `+` menambah baris; `x` menghapus (baris terakhir tidak bisa dihapus). Total baris = Harga × Jumlah; ubah Harga/Jumlah memperbarui Total & ringkasan total.

**AC-05 Filter berantai**
- Memilih Kategori mengosongkan Sub Kategori & memuat opsi yang sesuai (tabel dan form). Tahun hanya berisi tahun yang ada datanya.

**AC-06 Search/Sort/Paging**
- Search "tulis" menemukan transaksi ber-Sub Kategori "Alat Tulis". Sort total desc benar lintas halaman. Halaman 2 menampilkan data ke-11–20 (transaksi).

**AC-07 Export**
- Dengan filter Kategori=PK, Tahun=2026, search="sido", file `.xlsx` hanya memuat transaksi tersebut, urutan sama seperti tabel.

**AC-08 Cetak** — Klik ikon cetak membuka PDF berisi nomor surat, asal barang, penerima, tabel item, total.

**AC-09 Verifikasi** — Admin klik toggle → centang hijau, Edit/Hapus menjadi nonaktif; Operator tidak dapat toggle. Un-verify mengembalikan kemampuan edit.

**AC-10 Master & User** — Kode Kategori duplikat → error field "Kode sudah digunakan". Hapus Kategori ber-Sub → pesan jelas. Admin tidak dapat mengunci/menghapus dirinya. Password tanpa angka ditolak.

**AC-11 Lampiran** — File `.exe` ditolak; `.docx` 3 MB diterima; unduh lewat signed URL kedaluwarsa singkat.

---

## 9. Dependensi & Risiko Produk

| Risiko | Mitigasi |
|---|---|
| Cold start hosting gratis saat penilai menguji | Keep-alive + loading state + dokumentasi (ARCHITECTURE ADR-10) |
| Spesifikasi ambigu | §5 & §11 |
| Scope creep | Non-goals §1.2 |

---

## 10. Deliverables Test (ketentuan pengerjaan)

1. Repo publik (FE+BE+migrasi). 2. Deploy publik. 3. Video demo 2–5 menit. 4. `README.md` berisi **di bagian atas**: link live app & link video; lalu Tech Stack, Petunjuk instalasi lokal, Akun pengujian. Checklist rinci: `docs/ROADMAP.md` §4.

---

## 11. Open Questions (isi bila menemukan ambiguitas baru)

| ID | Pertanyaan | Default yang dipakai |
|---|---|---|
| OQ-01 | Apa sumber "Kode" & "Unit" di tabel Barang Masuk? | AS-02, AS-03 |
| OQ-02 | Mockup memakai username/nama pendek (`joko`, `Budi`) padahal spesifikasi min 8 | Ikuti spesifikasi (AS-09); konstanta mudah diubah di `shared/constants.ts` |
| OQ-03 | Siapa yang boleh verifikasi? | Admin saja (AS-05) |
| OQ-04 | Apakah Operator melihat data operator lain? | Tidak (AS-06) |
| OQ-05 | Jumlah boleh desimal (mis. 2,5 kg)? | Tidak, integer (AS-08) |
| OQ-06 | Ikon lonceng notifikasi? | Tidak dibuat (AS-14) |

---

## 12. Riwayat Perubahan

| Tanggal | Versi | Perubahan |
|---|---|---|
| (isi) | 1.0 | Versi awal |
