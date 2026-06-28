export const storageConfig = {
  maxImagesPerTrade: parseInt(process.env.MAX_IMAGES_PER_TRADE || '10'),
  maxImageSizeMb: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10'),
  allowedImageTypes: (
    process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,webp'
  ).split(','),
  thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || '300'),
  thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT || '200'),
  fullWidth: parseInt(process.env.FULL_WIDTH || '1200'),
  fullHeight: parseInt(process.env.FULL_HEIGHT || '800'),
};
