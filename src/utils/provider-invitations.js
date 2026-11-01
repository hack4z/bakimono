export async function getInvitationError(error, fallback) {
  const response = error?.context;
  if (typeof response?.json === "function") {
    try {
      const body = await response.json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error.trim();
      if (typeof body?.message === "string" && body.message.trim()) return body.message.trim();
    } catch {
      // Use the status-based message below when the edge function has no JSON body.
    }
  }

  if (error instanceof Error && error.message !== "Edge function returned a non-2xx status code") {
    return error.message;
  }
  if (response?.status === 409) {
    return "This person already has an active invitation or is already part of this provider.";
  }
  return fallback;
}
