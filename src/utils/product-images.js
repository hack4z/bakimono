import { supabase } from "~/utils/supabase";

const productImageBucket = "product_images";

export function getProductImageUrl(product) {
  const coverImage = product.cover_image?.trim();

  if (coverImage) {
    if (/^(https?:|data:|blob:)/i.test(coverImage)) return coverImage;

    const { data } = supabase.storage
      .from(productImageBucket)
      .getPublicUrl(coverImage);

    return data.publicUrl;
  }

  for (const image of product.images ?? []) {
    if (typeof image === "string" && image.trim()) return image.trim();
    if (image && typeof image === "object") {
      const url = image.url ?? image.src;
      if (typeof url === "string" && url.trim()) return url.trim();
    }
  }

  return "";
}
