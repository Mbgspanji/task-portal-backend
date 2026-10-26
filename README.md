# Secure Task Portal Backend

Backend REST API untuk aplikasi manajemen tugas dengan autentikasi JWT, role
`admin` dan `employee`, serta database PostgreSQL.

## Fitur

- Login dan autentikasi menggunakan JSON Web Token (JWT).
- Otorisasi berbasis role:
  - `admin` dapat mengelola user dan seluruh task.
  - `employee` hanya dapat mengakses dan mengubah task miliknya sendiri.
- Query PostgreSQL menggunakan parameterized queries untuk membantu mencegah SQL
  injection.
- Sanitasi judul dan deskripsi task menggunakan `xss`.
- Proteksi HTTP header menggunakan Helmet.
- Rate limiting:
  - Login: maksimal 5 kegagalan dalam 15 menit per perangkat.
  - API umum: maksimal 200 request dalam 15 menit per perangkat.
- Mendukung koneksi PostgreSQL lokal melalui variabel `DB_*` atau koneksi cloud
  melalui `DATABASE_URL`.
- Siap dijalankan sebagai Vercel Serverless Function melalui `api/index.js`.

## Teknologi

- Node.js
- Express 5
- PostgreSQL
- JSON Web Token
- bcrypt
- express-rate-limit
- Helmet
- xss

## Struktur Project

```text
.
├── api/index.js                  # Entry point Vercel
├── index.js                      # Entry point server lokal
├── src/
│   ├── config/                   # Koneksi dan inisialisasi database
│   ├── controllers/              # Handler HTTP request
│   ├── middlewares/             # Auth, authorization, rate limiter
│   ├── repositories/             # Query database
│   ├── routes/                  # Definisi endpoint
│   ├── services/                # Business logic dan sanitasi input
│   └── utils/seed.js            # Data awal development
├── .env.example
└── package.json
```

## Persyaratan

- Node.js 18 atau versi lebih baru.
- PostgreSQL 14 atau versi lebih baru, atau provider PostgreSQL cloud seperti
  Neon/Supabase.

## Instalasi Lokal

Clone repository, kemudian install dependency:

```bash
git clone <repository-url>
cd secure-task-portal-backend
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi nilainya:

```bash
copy .env.example .env
```

Pada macOS/Linux, gunakan:

```bash
cp .env.example .env
```

## Environment Variables

### PostgreSQL lokal

```env
PORT=5000
NODE_ENV=development

DB_USER=postgres
DB_HOST=localhost
DB_NAME=secure_task_db
DB_PASSWORD=your_db_password
DB_PORT=5432
DB_SSL=false
```

### PostgreSQL cloud atau Vercel

`DATABASE_URL` diprioritaskan jika tersedia dan menggantikan konfigurasi
`DB_*`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

Variabel keamanan yang diperlukan:

```env
JWT_SECRET=gunakan-random-secret-yang-panjang
JWT_EXPIRES_IN=8h
DEVICE_COOKIE_SECRET=gunakan-random-secret-lain-yang-panjang
```

Konfigurasi frontend/CORS:

```env
FRONTEND_URL=https://project-study-one.vercel.app
```

Jangan commit `.env` atau membagikan nilai credential database dan secret.

## Menjalankan Aplikasi

Mode development dengan Nodemon:

```bash
npm run dev
```

Mode production/lokal:

```bash
npm start
```

Server berjalan di `http://localhost:5000` secara default.

Database akan diinisialisasi saat server mulai berjalan. Untuk memasukkan data
contoh:

```bash
npm run seed
```

> Perintah seed membuat akun contoh untuk development. Segera ganti atau hapus
> password tersebut pada environment non-development.

## API Endpoints

Base URL lokal: `http://localhost:5000`

### Health Check

```http
GET /
```

### Authentication

```http
POST /api/auth/login
GET  /api/auth/profile
```

Contoh login:

```json
{
  "email": "employee@securetask.com",
  "password": "Employee@12345"
}
```

Gunakan token yang dikembalikan pada request berikutnya:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Tasks

Semua endpoint task membutuhkan JWT:

```http
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
PATCH  /api/tasks/:id/status
DELETE /api/tasks/:id
```

`DELETE /api/tasks/:id` hanya dapat diakses oleh admin. Employee hanya dapat
mengelola task miliknya sendiri.

Contoh membuat task:

```json
{
  "title": "Menyelesaikan dokumentasi",
  "description": "Menulis dokumentasi API",
  "status": "todo"
}
```

Status yang valid adalah:

- `todo`
- `in_progress`
- `done`

### Admin

Endpoint berikut membutuhkan JWT dengan role `admin`:

```http
POST /api/admin/users
GET  /api/admin/users
```

## Rate Limiting

Endpoint login membatasi maksimal lima respons gagal dalam jangka waktu 15
menit. Rate limit menggunakan cookie perangkat HTTP-only
`secure_task_device`, sehingga perangkat lain tidak ikut terblokir.

Untuk request dari frontend, pastikan cookie dikirim:

```js
fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password })
});
```

Jika batas tercapai, API mengembalikan HTTP `429`.

## Deployment ke Vercel

1. Import repository ke Vercel.
2. Set framework/preset sebagai project Node.js jika diperlukan.
3. Tambahkan environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `DEVICE_COOKIE_SECRET`
   - `FRONTEND_URL`
   - `NODE_ENV=production`
4. Deploy atau redeploy project.

Vercel akan menggunakan [api/index.js](./api/index.js) sebagai serverless
entry point. Endpoint API dapat diakses melalui:

```text
https://<nama-project>.vercel.app/api/...
```

## Keamanan

- Gunakan secret acak yang panjang untuk `JWT_SECRET` dan
  `DEVICE_COOKIE_SECRET`.
- Jangan menyimpan credential production di repository.
- Gunakan HTTPS pada deployment production.
- Jangan gunakan akun seed untuk production.
- Frontend harus melakukan output escaping saat menampilkan data user dan tidak
  merender input user menggunakan `innerHTML` tanpa sanitasi.

## Testing

Saat ini `package.json` belum memiliki test suite otomatis. Validasi syntax
file JavaScript dapat dilakukan dengan:

```bash
node --check index.js
node --check api/index.js
```

