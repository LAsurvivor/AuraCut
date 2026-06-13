export type HostedImagePayload = {
  createdAt?: string;
  deleteToken?: string;
  id: string;
  metadata?: {
    backgroundRemovalCreditsConsumed?: string;
    backgroundRemovalCreditsRemaining?: string;
    format?: string;
    height?: number;
    processedSizeBytes?: number;
    sourceSizeBytes?: number;
    width?: number;
  };
  originalUrl: string;
  processedUrl: string;
};

type ImageResponse = {
  image: HostedImagePayload;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const MAX_REQUEST_ATTEMPTS = 3;
const PRODUCTION_API_BASE_URL = "https://auracut-ai-background-remover.onrender.com";

function getApiBaseUrl(): string {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  if (process.env.NODE_ENV === "development" && isLocalHost && window.location.port === "8090") {
    return "http://127.0.0.1:8091";
  }

  if (isLocalHost || window.location.hostname.includes("onrender.com")) {
    return "";
  }

  if (window.location.hostname === "lasurvivor.github.io") {
    return PRODUCTION_API_BASE_URL;
  }

  return "";
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function readApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => undefined)) as ApiErrorResponse | undefined;

    return body?.error?.message ?? "The image service returned an error.";
  }

  return response.statusText || "The image service returned an error.";
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(input, init);
    } catch {
      lastError = new Error("Image service is unavailable. Start the backend and try again.");

      if (attempt === MAX_REQUEST_ATTEMPTS) {
        throw lastError;
      }

      await wait(250 * attempt);
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const message = await readApiError(response);
    lastError = new Error(message);

    if (attempt === MAX_REQUEST_ATTEMPTS || !isRetryableStatus(response.status)) {
      throw lastError;
    }

    await wait(250 * attempt);
  }

  throw lastError ?? new Error("The image service returned an error.");
}

export async function transformUploadedImage(file: File): Promise<HostedImagePayload> {
  const form = new FormData();
  form.append("image", file, file.name);

  const response = await fetchJson<ImageResponse>(apiUrl("/api/images"), {
    body: form,
    method: "POST"
  });

  return response.image;
}

export async function transformPresetImage(preset: string): Promise<HostedImagePayload> {
  const response = await fetchJson<ImageResponse>(apiUrl("/api/images/presets"), {
    body: JSON.stringify({ preset }),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  return response.image;
}

export async function fetchHostedImage(id: string): Promise<HostedImagePayload> {
  const response = await fetchJson<ImageResponse>(apiUrl(`/api/images/${encodeURIComponent(id)}`), {
    cache: "no-store",
    method: "GET"
  });

  return response.image;
}

export async function deleteHostedImage({ deleteToken, id }: { deleteToken: string; id: string }): Promise<void> {
  await fetchJson(apiUrl(`/api/images/${encodeURIComponent(id)}`), {
    headers: {
      "x-delete-token": deleteToken
    },
    method: "DELETE"
  });
}
