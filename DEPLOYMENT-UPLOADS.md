# Benevolent Midax deployment notes

## Upload storage on Render

The backend now supports Cloudinary uploads, which is the recommended option for Render because uploaded files receive permanent public URLs instead of being stored on temporary disk.

Set these backend environment variables:

`CLOUDINARY_CLOUD_NAME=...`

`CLOUDINARY_API_KEY=...`

`CLOUDINARY_API_SECRET=...`

If you still want local filesystem storage in development, you can keep these optional fallback paths:

`UPLOAD_ROOT=./backend/uploads`

`DOCUMENT_ROOT=./backend/documents`

For Render persistent disk storage, mount a disk at `/var/data` and point the fallback paths there.

This covers:
- carousel images
- gallery uploads
- member profile photos
- support/claim documents
- the Benevolent Constitution PDF
- chat attachments and voice notes

## Vercel frontend

Set the frontend environment variable:

`VITE_API_URL=https://benovelent-midax.onrender.com`

Do not place MongoDB, JWT, Cloudinary or other backend secrets in the Vercel frontend environment.

## Constitution

The current constitution supplied for this update is bundled in both:
- `backend/documents/benevolent-midax-constitution.pdf`
- `public/documents/benevolent-midax-constitution.pdf`

The backend serves it through `/documents/benevolent-midax-constitution.pdf`.


## Cloudinary
Use either `CLOUDINARY_URL` or the separate `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` variables.
