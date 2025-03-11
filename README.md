# Video Streaming Platform

This is a **video streaming platform** built using **Next.js 15.1.6**, inspired by YouTube. It supports **adaptive bitrate streaming (ABR)**, **HLS conversion**, and **React Query** for efficient caching.

## Features

- **Next.js 15.1.6** (App Router) for both frontend and backend.
- **Adaptive Bitrate Streaming (ABR)** using HLS.
- **React Query** for optimized data fetching and caching.
- **Video Uploads** with multi-resolution conversion.
- **Ant Design UI** for a polished user experience.
- **Virtualized Video List** for smooth performance.
- **Custom API Routes** for fetching videos dynamically.

## Tech Stack

- **Framework:** Next.js 15.1.6 (Frontend & Backend)
- **Streaming:** FFmpeg for HLS conversion
- **State Management:** React Query

## Installation

### Prerequisites
- Node.js 18+
- FFmpeg installed globally

### Steps

1. **Clone the repository:**
   ```sh
   git clone https://github.com/mp-patwa-mihir/youtube-clone.git
   cd youtube-clone
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Run the development server:**
   ```sh
   npm run dev
   ```

4. **Open the app in your browser:**
   ```
   http://localhost:3000
   ```

## Video Upload & Streaming

1. Users can upload videos via the UI.
2. The server processes videos using **FFmpeg**, generating multiple resolutions (HLS format).
3. The frontend fetches videos dynamically and plays them using **React Player** or a custom HLS player.

## Notes

- This project is **for local development only**.
- No database is used; videos are managed locally.
- Deployment is not planned at this stage.

## License
MIT

