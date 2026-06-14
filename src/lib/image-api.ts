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

export type ImageJobStage = "queued" | "removing" | "flipping" | "hosting" | "ready" | "failed";

type ImageJobPayload = {
  createdAt: string;
  error?: {
    code?: string;
    message?: string;
  };
  id: string;
  image?: HostedImagePayload;
  progress: number;
  stage: ImageJobStage;
  updatedAt: string;
};

type ImageJobResponse = {
  job: ImageJobPayload;
};

type ImageJobEvent = {
  job: ImageJobPayload;
  type: "progress" | "ready" | "failed";
};

export type ImageProgressStage = "uploading" | ImageJobStage;

export type ImageProgressUpdate = {
  progress: number;
  stage: ImageProgressStage;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

class ApiRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const MAX_REQUEST_ATTEMPTS = 3;
const PRODUCTION_API_BASE_URL = "https://auracut-ai-background-remover.onrender.com";

function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  }

  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  if (process.env.NODE_ENV === "development" && isLocalHost && window.location.port === "8090") {
    return "http://127.0.0.1:8091";
  }

  const explicitBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

  if (explicitBaseUrl) {
    return explicitBaseUrl;
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

function isRetryableError(error: unknown): boolean {
  return !(error instanceof ApiRequestError) || error.status === undefined || isRetryableStatus(error.status);
}

function parseApiErrorText(text: string, fallback: string): string {
  if (!text) {
    return fallback;
  }

  try {
    const body = JSON.parse(text) as ApiErrorResponse;

    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
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

async function postMultipartJsonWithProgress<T>({
  form,
  onUploadProgress,
  url
}: {
  form: FormData;
  onUploadProgress?: (progress: number) => void;
  url: string;
}): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open("POST", url);
        request.responseType = "text";
        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          onUploadProgress?.(Math.min(20, Math.round((event.loaded / event.total) * 20)));
        };
        request.onerror = () => reject(new ApiRequestError("Image service is unavailable. Start the backend and try again."));
        request.ontimeout = () => reject(new ApiRequestError("Image service timed out. Try again."));
        request.onload = () => {
          const text = typeof request.response === "string" ? request.response : "";

          if (request.status >= 200 && request.status < 300) {
            try {
              resolve(JSON.parse(text) as T);
            } catch {
              reject(new ApiRequestError("The image service returned an invalid response.", request.status));
            }
            return;
          }

          reject(new ApiRequestError(parseApiErrorText(text, request.statusText || "The image service returned an error."), request.status));
        };
        request.send(form);
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("The image service returned an error.");

      if (attempt === MAX_REQUEST_ATTEMPTS || !isRetryableError(lastError)) {
        throw lastError;
      }

      await wait(250 * attempt);
    }
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

export async function transformUploadedImageWithProgress(
  file: File,
  onProgress?: (update: ImageProgressUpdate) => void
): Promise<HostedImagePayload> {
  const form = new FormData();
  form.append("image", file, file.name);
  onProgress?.({ progress: 0, stage: "uploading" });

  const response = await postMultipartJsonWithProgress<ImageJobResponse>({
    form,
    onUploadProgress: (progress) => onProgress?.({ progress, stage: "uploading" }),
    url: apiUrl("/api/images/jobs")
  });
  onProgress?.({
    progress: Math.max(20, response.job.progress),
    stage: response.job.stage
  });

  return subscribeToImageJob(response.job.id, onProgress);
}

function subscribeToImageJob(
  jobId: string,
  onProgress?: (update: ImageProgressUpdate) => void
): Promise<HostedImagePayload> {
  return new Promise((resolve, reject) => {
    const source = new EventSource(apiUrl(`/api/images/jobs/${encodeURIComponent(jobId)}/events`));
    let consecutiveErrors = 0;
    let settled = false;

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("Image processing timed out. Try again.")));
    }, 135000);

    function finish(callback: () => void): void {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      source.close();
      callback();
    }

    function readEvent(event: MessageEvent): ImageJobEvent {
      return JSON.parse(event.data) as ImageJobEvent;
    }

    source.addEventListener("progress", (event) => {
      consecutiveErrors = 0;
      const data = readEvent(event);
      onProgress?.({
        progress: data.job.progress,
        stage: data.job.stage
      });
    });

    source.addEventListener("ready", (event) => {
      const data = readEvent(event);

      if (!data.job.image) {
        finish(() => reject(new Error("The image service returned an invalid response.")));
        return;
      }

      onProgress?.({
        progress: 100,
        stage: "ready"
      });
      finish(() => resolve(data.job.image as HostedImagePayload));
    });

    source.addEventListener("failed", (event) => {
      const data = readEvent(event);
      const message = data.job.error?.message ?? "Could not transform this image.";

      finish(() => reject(new Error(message)));
    });

    source.onerror = () => {
      consecutiveErrors += 1;

      if (consecutiveErrors >= MAX_REQUEST_ATTEMPTS) {
        finish(() => reject(new Error("Lost connection to the image service. Try again.")));
      }
    };
  });
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
