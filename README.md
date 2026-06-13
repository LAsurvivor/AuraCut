# AuraCut

AuraCut is a full-stack AI image transformation service. Users upload one image, the backend removes the background through Clipdrop, flips the result horizontally with Sharp, hosts the original and processed images on Cloudinary, and returns a shareable URL plus a signed delete token.

## Project Structure

```txt
src/
  app/                 Next.js App Router pages
  components/          Frontend UI components
  lib/                 Frontend browser helpers
backend/
  src/
    config/            Environment parsing
    errors/            Typed HTTP errors
    plugins/           Fastify plugins and error handling
    routes/            API routes
    services/          Clipdrop, Sharp, Cloudinary, token services
    utils/             Upload validation and shared helpers
public/                Static images and presets
```

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- Backend: Fastify, TypeScript, Clipdrop Remove Background API, Sharp, Cloudinary.
- Deployment: GitHub Pages for the static frontend, or a Node service that serves `out/` and `/api/*`.

## API

```txt
GET    /api/health
POST   /api/images
GET    /api/images/:id
DELETE /api/images/:id
```

`POST /api/images` accepts one multipart image file. Supported formats are PNG, JPG/JPEG, and WEBP.

`GET /api/images/:id` returns the hosted original and processed image URLs.

`DELETE /api/images/:id` requires the `x-delete-token` header returned by the upload response.

All API errors return a consistent shape:

```json
{
  "error": {
    "code": "unsupported_file_type",
    "message": "Please upload a PNG, JPG, JPEG, or WEBP image."
  }
}
```

## Environment

Copy `.env.example` to `.env` and fill in the secrets:

```bash
cp .env.example .env
```

Required:

```txt
CLIPDROP_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
DELETE_TOKEN_SECRET
```

Optional:

```txt
MAX_UPLOAD_MB=10
PORT=8090
```

## Local Development

Frontend:

```bash
npm install
npm run dev
```

Backend API:

```bash
npm run dev:backend
```

Open `http://localhost:8090`. In development, the frontend runs on port `8090` and API requests are sent to the backend on port `8091`.

## Build

```bash
npm run typecheck
npm run build
```

`npm run build` generates:

- `out/` for the static frontend
- `dist/backend/` for the TypeScript backend

## Production

```bash
NODE_ENV=production npm run start
```

The backend serves `/api/*` and, when `out/` exists, the static frontend.

## Notes

- Upload validation checks file signatures rather than trusting extensions.
- Delete authorization uses an HMAC token bound to the image id.
- The frontend still includes preset demo images so reviewers can explore the UI without spending background-removal credits.
