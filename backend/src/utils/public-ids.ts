export type ImagePublicIds = {
  deleted: string;
  original: string;
  processed: string;
};

export function buildImagePublicIds(id: string): ImagePublicIds {
  return {
    deleted: `auracut/${id}/deleted`,
    original: `auracut/${id}/original`,
    processed: `auracut/${id}/processed`
  };
}
