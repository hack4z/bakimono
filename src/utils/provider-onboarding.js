import { supabase } from "~/utils/supabase-client";

export const providerSignupSteps = ["business", "social", "gallery", "verification", "payment"];

export function normalizeProviderSignupStep(value) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, " ").replace(/\s+step$/, "");
  const aliases = {
    "business details": "business",
    "social links": "social",
    "photo gallery": "gallery",
    "payment details": "payment",
    complete: "complete",
    completed: "complete",
  };
  if (aliases[normalized]) return aliases[normalized];
  const matchingStep = providerSignupSteps.find((step) => step === normalized.replace(/\s+/g, "_"));
  return matchingStep ?? "";
}

export async function getCurrentProviderOnboardingStep() {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve({ timedOut: true }), 8000);
  });
  const progressRequest = supabase.rpc("provider_exists_for_current_user");
  const result = await Promise.race([progressRequest, timeout]);
  window.clearTimeout(timeoutId);
  if (result.timedOut) {
    throw new Error("Loading onboarding progress took too long. Please refresh the page.");
  }
  const { data, error } = result;
  if (error) throw error;

  const rpcResult = Array.isArray(data) ? data[0] : data;
  if (!rpcResult || rpcResult === false) {
    return { providerExists: false, nextStep: "business" };
  }
  if (typeof rpcResult === "string") {
    try {
      const parsed = JSON.parse(rpcResult);
      if (parsed && typeof parsed === "object") {
        const normalizedStep = normalizeProviderSignupStep(
          parsed.step ?? parsed.current_step ?? parsed.next_step ?? parsed.onboarding_step,
        );
        return {
          providerExists: parsed.provider_exists !== false,
          nextStep: normalizedStep === "complete" ? null : normalizedStep || "business",
          complete: normalizedStep === "complete",
          provider: parsed.provider ?? parsed,
        };
      }
    } catch {
      const step = normalizeProviderSignupStep(rpcResult);
      return {
        providerExists: !["false", "no"].includes(rpcResult.toLowerCase()),
        nextStep: step === "complete" ? null : step || "business",
        complete: step === "complete",
      };
    }
  }
  if (rpcResult && typeof rpcResult === "object") {
    const normalizedStep = normalizeProviderSignupStep(
      rpcResult.step ?? rpcResult.current_step ?? rpcResult.next_step ?? rpcResult.onboarding_step,
    );
    return {
      providerExists: rpcResult.provider_exists !== false,
      nextStep: normalizedStep === "complete" ? null : normalizedStep || "business",
      complete: normalizedStep === "complete",
      provider: rpcResult.provider ?? rpcResult,
    };
  }
  return { providerExists: true, nextStep: "business", complete: false };
}
