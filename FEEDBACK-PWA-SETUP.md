# Benevolent Midax — PWA + Feedback setup

## Frontend .env (Vercel/local)
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com

## Backend .env (Render/local)
PORT=5000
NODE_ENV=production
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# Optional: Resend email
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=your_verified_sender_email

## Commands
# project root
npm ci
npm run build

# backend
cd backend
npm ci
npm start

# local frontend in a second terminal
cd ..
npm run dev

Feedback needs no new third-party service. Google Forms collections only store the external URL. Native responses are stored in MongoDB.
