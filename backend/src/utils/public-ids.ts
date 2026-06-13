export type ImagePublicIds = {
  original: string;
  processed: string;
};

export function buildImagePublicIds(id: string): ImagePublicIds {
  return {
    original: `auracut/${id}/original`,
    processed: `auracut/${id}/processed`
  };
}
