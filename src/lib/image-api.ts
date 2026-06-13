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

function getApiBaseUrl(): string {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (isLocalHost && window.location.port === "8090") {
      return "http://127.0.0.1:8091";
    }
  }

  return "";
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
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
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new Error("Image service is unavailable. Start the backend and try again.");
  }

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as T;
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
