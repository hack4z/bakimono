import { supabase } from "~/utils/supabase-client"


export function getSupabaseErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const details = [
      error.message,
      error.details,
      error.hint,
      error.code ? `code ${error.code}` : '',
    ].filter(Boolean)
    if (details.length) return details.join(' — ')
  }

  return fallback
}

export function normalizeKenyanPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "")
  const national = digits.startsWith("254")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits

  return /^[17]\d{8}$/.test(national) ? `254${national}` : ""
}

export async function uploadAvatar(userId, file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.")
  }

  const extension = file.type === "image/jpeg"
    ? "jpg"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : String(file.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "") || "img"
  const path = `${userId}/avatar.${extension}`
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(userId)
  const previousAvatars = (existingFiles ?? [])
    .map((existingFile) => existingFile.name)
    .filter((name) => /^avatar\.[^.]+$/i.test(name))
  if (previousAvatars.length) {
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove(previousAvatars.map((name) => `${userId}/${name}`))
    if (removeError) throw removeError
  }
  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    })

  if (error) throw error
  return data.path
}

export function getAvatarUrl(path) {
  if (!path) return null
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
}

export async function getUserAvatarUrl(userId) {
  if (!userId) return ""

  const folder = userId
  const { data, error } = await supabase.storage
    .from("avatars")
    .list(folder, { limit: 100 })
  if (error) {
    console.error(`Unable to list avatar files for user ${userId}:`, error)
    return ""
  }

  const avatar = (data ?? []).find((file) => /^avatar\.[^.]+$/i.test(file.name))
  return avatar ? getAvatarUrl(`${folder}/${avatar.name}`) ?? "" : ""
}