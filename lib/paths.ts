export const APP_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (!path.startsWith("/") || APP_BASE_PATH === "") {
    return path;
  }

  return `${APP_BASE_PATH}${path}`;
}

export function createShareUrl(id: string): string {
  const shareUrl = new URL(`${APP_BASE_PATH}/i/`, window.location.origin);
  shareUrl.searchParams.set("id", id);

  return shareUrl.toString();
}
