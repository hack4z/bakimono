import { supabase } from "~/utils/supabase";
import { providerStorageBucket } from "~/utils/provider-storage";

const productImageBucket = providerStorageBucket;
const legacyProductImageBucket = "product_images";
let productImageListingErrorLogged = false;

async function findProductCoverUrl(bucket, folder, productId) {
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 100, search: productId });
  if (listError) {
    if (!productImageListingErrorLogged) {
      console.error(`Unable to list objects in the ${bucket} bucket:`, listError);
      productImageListingErrorLogged = true;
    }
    return "";
  }

  const matchingFile = (files ?? []).find((file) => file.name.startsWith(`${productId}.`));
  if (!matchingFile) return "";

  const path = `${folder}/${matchingFile.name}`;
  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  if (!signedUrlError && signedUrl?.signedUrl) return signedUrl.signedUrl;

  console.error(`Unable to create a URL for product image ${path}:`, signedUrlError);
  return "";
}

export async function getProductCoverUrl(providerId, productId) {
  if (!providerId || !productId) return "";

  const providerCoverUrl = await findProductCoverUrl(
    productImageBucket,
    `${providerId}/products`,
    productId,
  );
  if (providerCoverUrl) return providerCoverUrl;

  return findProductCoverUrl(legacyProductImageBucket, "products", productId);
}
