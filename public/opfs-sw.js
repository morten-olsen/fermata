/**
 * Service worker that serves files from the Origin Private File System (OPFS).
 *
 * Intercepts requests to /_opfs/* and reads the corresponding file from OPFS.
 * This provides stable, reusable URLs for files stored in OPFS — unlike blob:
 * URLs which are ephemeral and break on page reload.
 *
 * Used for: artwork images, downloaded audio files, and any other OPFS content.
 */

const OPFS_PREFIX = "/_opfs/";

// MIME types by extension
const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  aac: "audio/aac",
  m4a: "audio/mp4",
  track: "audio/mpeg", // our generic download extension
  episode: "audio/mpeg",
  audiobook: "audio/mpeg",
};

function getMimeType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (!url.pathname.startsWith(OPFS_PREFIX)) return;

  event.respondWith(handleOpfsRequest(url.pathname));
});

async function handleOpfsRequest(pathname) {
  const relativePath = pathname.slice(OPFS_PREFIX.length);
  const segments = relativePath.split("/").filter(Boolean);

  if (segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  try {
    let dir = await navigator.storage.getDirectory();

    // Navigate to the directory
    for (let i = 0; i < segments.length - 1; i++) {
      dir = await dir.getDirectoryHandle(segments[i]);
    }

    // Get the file
    const fileName = segments[segments.length - 1];
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();

    const mimeType = file.type || getMimeType(fileName);

    return new Response(file.stream(), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(file.size),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
