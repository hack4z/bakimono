import { supabase } from "~/utils/supabase-client";

export async function checkProfileCompletion() {
  const { data, error } = await supabase.rpc("check_profile_completion");
  if (error) {
    let errorData = null;
    if (error.context?.json) {
      try {
        errorData = await error.context.json();
      } catch {
        errorData = null;
      }
    }
    const normalizedError = normalizeProfileCompletion(errorData);
    if (normalizedError?.status) return normalizedError;
    throw new Error(error.message || "Unable to check profile completion.");
  }
  return normalizeProfileCompletion(data);
}

export function isProfileComplete(result) {
  return result?.status === "profile_complete";
}

export function normalizeProfileCompletion(value) {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    if (typeof item === "string") {
      try {
        const parsed = normalizeProfileCompletion(JSON.parse(item));
        if (parsed?.status) return parsed;
      } catch {
        if (/^(not_signed_in|profile_not_found|profile_incomplete|profile_complete)$/.test(item)) {
          return { status: item };
        }
      }
    } else if (item && typeof item === "object") {
      if (typeof item.status === "string") return item;

      for (const nestedValue of Object.values(item)) {
        const nested = normalizeProfileCompletion(nestedValue);
        if (nested?.status) return nested;
      }
    }
  }
  return null;
}
