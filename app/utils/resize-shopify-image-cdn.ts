export const resizeShopifyImageCdn = (image: string, width: number, height: number) => {
  let resizedImage = image;

  // Handle width parameter
  if (resizedImage.includes('width=')) {
    resizedImage = resizedImage.replace(/([?&])width=\d+/, `$1width=${width}`);
  } else {
    resizedImage += resizedImage.includes('?') ? `&width=${width}` : `?width=${width}`;
  }

  // Handle height parameter
  if (resizedImage.includes('height=')) {
    resizedImage = resizedImage.replace(/([?&])height=\d+/, `$1height=${height}`);
  } else {
    resizedImage += resizedImage.includes('?') ? `&height=${height}` : `?height=${height}`;
  }

  return resizedImage;
};