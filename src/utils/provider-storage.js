import { supabase } from "~/utils/supabase-client";

export const providerStorageBucket = "providers";
const signedUrlCache = new Map();

export function getProviderStoragePath(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const trimmedValue = value.trim();
  if (!/^https?:\/\//i.test(trimmedValue)) return trimmedValue.replace(/^\/+/, "");

  try {
    const url = new URL(trimmedValue);
    const match = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/(?:providers|provider_images)\/(.+)$/.exec(url.pathname);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

export async function getProviderStorageUrls(values, expiresIn = 60 * 60) {
  const pathsToSign = new Set();
  const urls = values.map((value) => {
    const path = getProviderStoragePath(value);
    if (!path) return typeof value === "string" && /^https?:\/\//i.test(value) ? value : "";

    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;

    pathsToSign.add(path);
    return "";
  });

  if (pathsToSign.size > 0) {
    const paths = [...pathsToSign];
    const { data, error } = await supabase.storage
      .from(providerStorageBucket)
      .createSignedUrls(paths, expiresIn);
    if (error) throw error;

    const signedByPath = new Map(
      (data ?? []).map((result) => [result.path, result]),
    );
    for (const path of paths) {
      const result = signedByPath.get(path);
      if (result?.error || !result?.signedUrl) {
        throw new Error(
          result?.error
            ? `Unable to create a signed URL for provider file "${path}": ${result.error}`
            : `Supabase did not return a signed URL for provider file "${path}".`,
        );
      }
      signedUrlCache.set(path, {
        url: result.signedUrl,
        expiresAt: Date.now() + expiresIn * 1000,
      });
    }

    for (let index = 0; index < values.length; index += 1) {
      const path = getProviderStoragePath(values[index]);
      if (path && !urls[index]) urls[index] = signedUrlCache.get(path).url;
    }
  }

  return urls;
}

export async function getProviderStorageUrl(value, expiresIn = 60 * 60) {
  const [url] = await getProviderStorageUrls([value], expiresIn);
  return url;
}
