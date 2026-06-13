"use client";

const DB_NAME = "auracut-image-store";
const DB_VERSION = 1;
const STORE_NAME = "images";

export type StoredImageRecord = {
  blob: Blob;
  createdAt: number;
  filename: string;
  id: string;
  mimeType: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Browser image storage is unavailable."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error ?? new Error("Could not open image storage."));
    request.onsuccess = () => resolve(request.result);
  });
}

function runStoreTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = action(store);

        request.onerror = () => reject(request.error ?? new Error("Image storage request failed."));
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error("Image storage transaction failed."));
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("Image storage transaction was aborted."));
        };
      })
  );
}

export async function saveImageFromUrl({
  filename,
  id,
  url
}: {
  filename: string;
  id: string;
  url: string;
}): Promise<StoredImageRecord> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not save generated image.");
  }

  const blob = await response.blob();
  const record: StoredImageRecord = {
    blob,
    createdAt: Date.now(),
    filename,
    id,
    mimeType: blob.type || "image/png"
  };

  await runStoreTransaction("readwrite", (store) => store.put(record));

  return record;
}

export async function getStoredImage(id: string): Promise<StoredImageRecord | undefined> {
  return runStoreTransaction<StoredImageRecord | undefined>("readonly", (store) => store.get(id));
}

export async function deleteStoredImage(id: string): Promise<void> {
  await runStoreTransaction("readwrite", (store) => store.delete(id));
}
