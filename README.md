# AuraCut

![AuraCut brand banner](public/images/readme-banner.svg)

AuraCut is a polished AI image transformation app for removing backgrounds, flipping images horizontally, and sharing the final result with a hosted URL.

The product is designed as a compact, cinematic one-frame workflow: upload an image, watch it process, preview the transparent result, then copy a shareable link or download the transformed image.

Live app: [https://lasurvivor.github.io/AuraCut/](https://lasurvivor.github.io/AuraCut/)

## Product Highlights

- Upload a single PNG, JPG, JPEG, or WEBP image.
- Remove the image background with AI.
- Flip the processed image horizontally.
- Host the transformed image online.
- Generate a unique shareable image URL.
- Download the final image.
- Delete hosted images when they are no longer needed.
- Hosted image assets expire after 7 days.
- Try built-in sample images without spending background-removal credits.

## User Experience

AuraCut keeps the full workflow in one focused transformation card.

Before upload, the interface presents a minimal drag-and-drop area with curated sample images. During processing, the card becomes a smooth rendering state with a dot-field animation and lightweight progress feedback. When the result is ready, the same card reveals the transformed image with compact actions for compare, copy URL, download, re-upload, and delete.

The UI is responsive across desktop and mobile, preserves image aspect ratios, and avoids distortion by fitting previews inside a stable canvas.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- Backend: Fastify, TypeScript, Sharp, Cloudinary, Clipdrop Remove Background API.
- Storage and hosting: Cloudinary.
- Deployment: GitHub Pages for the static frontend and Render for the TypeScript backend.

## Architecture

```txt
src/
  app/                 Next.js App Router pages
  components/          Product UI components
  lib/                 Frontend browser and API helpers

backend/
  src/
    config/            Environment parsing
    errors/            Typed HTTP errors
    plugins/           Fastify plugins and error handling
    routes/            API routes
    services/          Image processing, hosting, presets, delete tokens
    utils/             Upload validation and shared helpers

public/
  images/              Static hero and preset assets
```

## API Overview

```txt
GET    /api/health
POST   /api/images
POST   /api/images/jobs
GET    /api/images/jobs/:jobId/events
POST   /api/images/presets
GET    /api/images/:id
DELETE /api/images/:id
```

`POST /api/images` accepts one multipart image file, validates the upload, removes the background, flips the result, hosts the original and processed images, and returns metadata for the frontend.

`POST /api/images/jobs` starts the same transform flow as a background job. `GET /api/images/jobs/:jobId/events` streams processing stages with Server-Sent Events so the frontend can show progress without polling.

`POST /api/images/presets` hosts one of the built-in sample image pairs through the same image lifecycle without calling the background-removal provider.

`GET /api/images/:id` returns a hosted image record.

`DELETE /api/images/:id` invalidates the hosted result when a valid delete token is provided.

API errors use a consistent response shape:

```json
{
  "error": {
    "code": "unsupported_file_type",
    "message": "Please upload a PNG, JPG, JPEG, or WEBP image."
  }
}
```

## Error Handling And Reliability

- Upload validation checks file signatures instead of trusting extensions.
- External image-processing and hosting calls include retry handling where appropriate.
- Backend routes return typed, user-friendly errors.
- Delete authorization is scoped to the generated image record.
- Hosted Cloudinary image assets use a 7-day anonymous access window.
- Sample images follow the same hosted URL lifecycle as user uploads.

## Environment Variables

Create a local `.env` file from the example template:

```bash
cp .env.example .env
```

Required variables:

```txt
CLIPDROP_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
DELETE_TOKEN_SECRET
```

Optional variables:

```txt
MAX_UPLOAD_MB=10
PORT=8090
ALLOWED_ORIGINS=http://localhost:8090
NEXT_PUBLIC_API_BASE_URL=http://localhost:8091
```

Never commit real credentials or private access codes to the repository.

## Build

```bash
npm run typecheck
npm run build
```

`npm run build` generates the static frontend in `out/` and the compiled backend in `dist/backend/`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Start the backend API in a second terminal:

```bash
npm run dev:backend
```

Open `http://localhost:8090`.

In development, the frontend runs on port `8090`, and API requests are sent to the backend on port `8091`.
