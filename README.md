# AuraCut

AuraCut is a polished frontend prototype for an AI image transformation product. The UI lets users upload one image, simulates background removal, flips the result horizontally, and presents a mock hosted share URL.

This version is frontend-only by design. It uses mock processing states and mock hosted URLs so the product experience can be reviewed before the backend is connected.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React icons

## Experience

- Premium SaaS landing page with AuraCut branding, CTA navigation, and product preview.
- Single transformation card for upload, processing, result preview, and actions.
- Drag-and-drop or file picker upload for PNG, JPG, JPEG, and WEBP.
- Elegant processing animation with light sweep, subject aura, shimmer, and rotating status copy.
- Mock result on a checkerboard transparency background with horizontal flip.
- Compare toggle, copy URL, download, re-upload, delete, and toast feedback.
- Responsive image previews that use `object-fit: contain` to avoid distortion across portrait, landscape, square, wide, and tall images.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:8090`.

## Production Build

```bash
npm run build
npm run start
```

## Backend Integration Plan

The current UI is ready to connect to a TypeScript backend later. The natural API shape is:

```txt
POST   /api/images
DELETE /api/images/:id
```

`POST /api/images` should accept one image, call a background removal provider, flip the transparent PNG horizontally, upload the final asset to cloud storage, and return a hosted URL. `DELETE /api/images/:id` should delete both uploaded and processed assets with a server-side authorization token.
