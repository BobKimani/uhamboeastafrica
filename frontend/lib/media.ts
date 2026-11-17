const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");

const LEGACY_S3_HOST_PATTERN =
  /^uhambo-s3-bucket\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/;

// Former CloudFront distribution. Media is now served from the VPS
// (NEXT_PUBLIC_MEDIA_URL), so any stored CloudFront URLs are remapped there.
const LEGACY_CLOUDFRONT_HOST = "d2fbz2lzk71lum.cloudfront.net";

const LEGACY_CATALOG_IMAGE_PATHS: Record<string, string> = {
  "10-seater-van.png": "assets/vehicles/10-seater-van.png",
  "alphard.jpg": "assets/vehicles/alphard.jpg",
  "coaster.png": "assets/vehicles/coaster.png",
  "diani-beach.jpg": "assets/destinations/diani-beach.jpg",
  "expedition-truck.jpg": "assets/vehicles/expedition-truck.jpg",
  "mara-river-lodge.jpg": "assets/hotels/mara-river-lodge.jpg",
  "ngorongoro.jpg": "assets/destinations/ngorongoro.jpg",
  "noah.jpg": "assets/vehicles/noah.jpg",
  "rwanda-hills.jpg": "assets/destinations/rwanda-hills.jpg",
  "serengeti.jpg": "assets/destinations/serengeti.jpg",
  "toyota-land-cruiser.jpg": "assets/vehicles/toyota-land-cruiser.jpg",
  "uganda-gorilla.jpg": "assets/destinations/uganda-gorilla.jpg",
};

function mediaPathFromLegacyUrl(url: URL) {
  if (
    !LEGACY_S3_HOST_PATTERN.test(url.hostname) &&
    url.hostname !== LEGACY_CLOUDFRONT_HOST
  ) {
    return null;
  }
  return url.pathname.replace(/^\/+/, "");
}

function remapLegacyCatalogPath(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  const match = normalizedPath.match(/^catalog\/([^/]+)$/);
  if (!match) return normalizedPath;
  return LEGACY_CATALOG_IMAGE_PATHS[match[1]] ?? normalizedPath;
}

function mediaBaseUrl() {
  if (!MEDIA_BASE_URL) {
    throw new Error("NEXT_PUBLIC_MEDIA_URL is required to resolve Uhambo media assets.");
  }
  return MEDIA_BASE_URL;
}

export function mediaUrl(path: string) {
  if (!path) return path;

  if (/^(data:|blob:)/.test(path)) {
    return path;
  }

  try {
    const url = new URL(path);
    const legacyPath = mediaPathFromLegacyUrl(url);
    if (legacyPath) {
      return `${mediaBaseUrl()}/${remapLegacyCatalogPath(legacyPath)}`;
    }
    // The media base may include a path prefix (e.g. https://api.example.com/media),
    // so match on the full base rather than just the origin.
    const base = new URL(mediaBaseUrl());
    const basePath = base.pathname.replace(/\/+$/, "");
    if (
      url.origin === base.origin &&
      (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))
    ) {
      return `${mediaBaseUrl()}/${remapLegacyCatalogPath(url.pathname.slice(basePath.length))}`;
    }
    return path;
  } catch {
    // Relative media path.
  }

  const normalizedPath = remapLegacyCatalogPath(path);
  return `${mediaBaseUrl()}/${normalizedPath}`;
}
