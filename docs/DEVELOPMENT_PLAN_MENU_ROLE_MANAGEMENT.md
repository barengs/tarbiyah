# Development Plan & Task List: Manajemen Menu & Role (Tarbiyah / Port 8002)

## 1. Tujuan & Prinsip

Membangun fitur **manajemen menu dan role** di dalam sistem Tarbiyah, mengikuti pola yang sudah
terbukti pada `bank-santri`, dengan beberapa perbaikan:

| Prinsip | Penjelasan |
|---|---|
| **Menu berbasis database** | Menu disimpan di tabel `menus` sehingga bisa diatur dinamis (aktif/nonaktif, urut, ikon) tanpa ubah kode. |
| **Role menggunakan istilah familiar** | Role menggunakan istilah yang sudah familiar di ekosistem (mengikuti `smpt`): `superadmin`, `admin`, `staf`, `asatidz`, `walikelas`. |
| **Role & menu disimpan di Tarbiyah** | Manajemen role & menu berada di dalam sistem Tarbiyah (bukan di luar), karena menu adalah halamannya sendiri. Menjaga modularitas & menghindari SPOF. |
| **Permission matrix** | Matriks `{menu_slug}.{action}` (view, create, update, delete, print, approve) dikelola Spatie; enforcement bisa dipasang di route API. |
| **SSO handover tetap** | Staf dari portal utama (smpt) masuk via SSO. Role dipetakan dari role smpt yang relevan. |
| **Guru luar login langsung** | Guru luar tetap membuat akun lokal dengan kredensial sendiri. |

---

## 2. Arsitektur & Alur

```
   ┌──────────────────────────────────────────────┐
   │              SMPT (Portal Utama)             │
   │  Role smpt yang relevan:                     │
   │   superadmin, admin, asatidz, staf,          │
   │   walikelas                                   │
   │  (teller, orangtua, adminbank -> tidak dipetakan) │
   └──────────────────────────────────────────────┘
                    │ SSO Handover (?token=...)
                    ▼
   ┌──────────────────────────────────────────────┐
   │            TARIYAH (Port 8002)               │
   │                                              │
   │  MENUS (sidebar, parent/child, is_active)   │
   │     │                                        │
   │     ▼  (pivot role_menu)                     │
   │  ROLE (spatie):                              │
   │   superadmin / admin / staf / asatidz /      │
   │   walikelas                                  │
   │     │  (matriks permission)                  │
   │     ▼                                        │
   │  PERMISSION  ({menu_slug}.{action})          │
   │   view/create/update/delete/print/approve    │
   │                                              │
   │  GET /api/auth/menus  -> sidebar dinamis      │
   │  middleware permission:*** -> guard route     │
   └──────────────────────────────────────────────┘
```

**Alur runtime:**
1. User login (SSO dari smpt, atau akun lokal) → JWT di-issue.
2. Frontend memanggil `GET /api/auth/menus` → mengembalikan daftar menu sesuai role user.
3. Sidebar dirender dari API (bukan hardcoded).
4. Setiap route API dilindungi middleware `permission:{menu_slug}.{action}`.
5. Admin mengelola menu/role/permission dari halaman admin.

---

## 3. Keputusan Desain (Improvement dari bank-santri)

1. **Kolom `slug` eksplisit** di tabel `menus` (tidak dihitung dari `name`). Menghindari
   bug bank-santri di mana ganti nama menu mengubah slug → permission lama jadi tak berlaku.
2. **Kolom `permission_slug`** — kunci stable untuk matriks permission, dipisah dari nama tampilan.
3. **Kolom `is_active`** — menu bisa dinonaktifkan tanpa menghapus.
4. **Enforcement di backend** — pasang middleware `permission:` di `routes/api.php`
   (bank-santri & tarbiyah saat ini 0 pemakaian).
5. **Seeder idempotent & modular** — `MenuSeeder`, `RoleSeeder`, `RolePermissionSeeder` dipisah.
6. **Role familiar** — `superadmin, admin, staf, asatidz, walikelas`. Pemetaan dari smpt:

   | Role smpt (relevan) | Role Tarbiyah |
   |---|---|
   | `superadmin` | `superadmin` |
   | `admin` | `admin` |
   | `asatidz` | `asatidz` |
   | `staf` | `staf` |
   | `walikelas` | `walikelas` |
   | `teller`, `orangtua`, `adminbank` | (tidak dipetakan / tidak relevan) |

7. **Default role saat SSO** — jika role dari smpt tidak dikenali, default `staf`,
   lalu admin bisa menaikkan ke `asatidz`/`walikelas`/dll di halaman Manajemen User.

---

## 4. Struktur Tabel Baru

### `menus`
```
id (PK), parent_id (FK nullable -> menus.id),
slug (unique, stable), name, icon, path,
sort_order, is_divider (bool), is_active (bool), permission_slug,
timestamps
```
### `role_menu` (pivot)
```
role_id (FK -> roles.id), menu_id (FK -> menus.id), primary([role_id, menu_id])
```
### `permissions` (spatie) — diisi dari matriks `{menu_slug}.{action}`
### `role_has_permissions`, `model_has_roles`, `model_has_permissions` — spatie (sudah ada).

> Tabel `permissions` & pivot spatie sudah dibuat di `2026_10_18_134236_create_permission_tables.php`.
> Yang baru: `menus` + `role_menu`.

---

## 5. Task List & Definition of Done

Status: **T** = belum, **P** = berjalan, **F** = selesai.

### Fase A — Skema Data & Model
| ID | Task | Status | Output / DoD |
|---|---|---|---|
| A1 | Migration `create_menu_management_tables` (`menus`, `role_menu`) | F | Tabel terbentuk, FK cascade benar, lint lolos. |
| A2 | Model `Menu` (rel. `children`, `parent`, `roles`; kolom `slug`,`is_active`,`permission_slug`) | F | Relasi test lolos, `with('children')` mengembalikan tree. |
| A3 | Model `Role` extend Spatie Role + relasi `menus()` | F | `Role::find(...)->menus` bekerja. |
| A4 | `MenuSeeder` (idempotent, semua menu sidebar + `permission_slug` stable) | F | Seed 2x tidak duplikat; data sesuai sidebar. |
| A5 | `RoleSeeder` (superadmin, admin, staf, asatidz, walikelas) | F | 5 role dibuat, idempotent. |
| A6 | `RolePermissionSeeder` (matriks + assign ke role) | F | Matriks terisi, superadmin dapat semua. |
| A7 | `SuperAdminSeeder` / upsert akun superadmin default | F | 1 akun superadmin tersedia. |

### Fase B — API Keamanan (Menu, Role, Permission, User)
| ID | Task | Status | Output / DoD |
|---|---|---|---|
| B1 | `SecurityController` (menu CRUD, role CRUD, sync menus, sync permissions, getPermissions) | F | Endpoint respons JSON konsisten. |
| B2 | `UsersController` (user CRUD, assign role, reset password) | F | Admin bisa kelola user & assign role. |
| B3 | `GET /api/auth/menus` (menu sesuai role login, respect `is_active`) | F | Role berbeda → daftar menu berbeda. |
| B4 | Daftarkan route di `routes/api.php` (group security) | F | Route terdaftar, butuh auth `api`. |
| B5 | Pasang middleware `permission:{menu_slug}.{action}` di route terkait | F | Akses tanpa permission → 403. |

### Fase C — SSO Handover & Role Mapping
| ID | Task | Status | Output / DoD |
|---|---|---|---|
| C1 | Perbaiki `AuthController::ssoHandover` → petakan role smpt → role tarbiyah | F | 5 role terpetakan benar. |
| C2 | Default role `staf` jika role smpt tak dikenali | F | User SSO baru dapat `staf`. |
| C3 | `user->syncRoles([...])` saat SSO | F | Role tidak bocor / tak terhapus. |
| C4 | Akun lokal guru luar tetap login langsung | F | Login lokal menghasilkan JWT + role. |

### Fase D — Frontend (Sidebar dinamis + Halaman Admin)
| ID | Task | Status | Output / DoD |
|---|---|---|---|
| D1 | RTK Query `securityApi` (menus, menu, role, permission, user) | F | Query cache berfungsi. |
| D2 | Sidebar dinamis: render dari `auth/menus`, ikon lucide, sub-menu, active state | F | Sidebar sesuai role, collapse berfungsi. |
| D3 | Route guard berbasis permission | F | Menu tanpa permission diblokir. |
| D4 | Halaman `MenuManagement` (CRUD, urut, aktif/nonaktif, assign per role) | F | Admin bisa atur menu. |
| D5 | Halaman `RolePermission` (matriks role × permission + assign menu) | F | Matriks tersinkron. |
| D6 | Halaman `UserManagement` (CRUD user, assign role, reset password) | F | Admin bisa kelola user. |
| D7 | Integrasi menu admin ke sidebar (grup "Pengaturan", hanya admin/superadmin) | F | Menu admin tersembunyi untuk role lain. |

### Fase E — Testing & Verifikasi
| ID | Task | Status | Output / DoD |
|---|---|---|---|
| E1 | Uji SSO per role (5 role) | F | Masing-masing dapat menu benar. |
| E2 | Uji enforcement permission (403) | F | Guard bekerja. |
| E3 | Uji UI admin (ubah menu/role, refresh, konsisten) | F | Perubahan tercermin di sidebar. |
| E4 | `npm run build` + uji manual di `http://127.0.0.1:8002` | F | Build sukses, fitur jalan. |
| E5 | Dokumentasi + commit (JANGAN push) | F | Ter-commit di branch `main`. |

---

## 6. Batas & Batasan

- **TIDAK push ke remote** — semua commit lokal di branch `main`.
- Menu & role **disimpan di Tarbiyah** (keputusan desain: modularitas & anti-SPOF).
- Role: `superadmin, admin, staf, asatidz, walikelas`.
- Role smpt yang tidak relevan (`teller`, `orangtua`, `adminbank`) tidak dipetakan.
- Permission matrix mengikuti bank-santri: aksi `view, create, update, delete, print, approve`.
- Semua perubahan mengikuti aturan workspace `AGENTS.md`.

## 7. Urutan Pengerjaan
Fase A (skema & seeder) → Fase B (API) → Fase C (SSO) → Fase D (frontend) → Fase E (uji).

Jalankan seeder berurutan:
`php artisan db:seed --class=MenuSeeder --force`, `RoleSeeder`, `RolePermissionSeeder`, `SuperAdminSeeder`.
