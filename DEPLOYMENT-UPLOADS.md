# Benevolent Midax deployment notes

## Render persistent uploads

The application keeps uploads on the backend filesystem as requested. For Render, the filesystem is not durable across restarts unless a persistent disk is mounted.

Mount a Render persistent disk at:

`/var/data`

Set these backend environment variables:

`UPLOAD_ROOT=/var/data/uploads`

`DOCUMENT_ROOT=/var/data/documents`

The backend automatically creates the folders when an upload arrives.

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
