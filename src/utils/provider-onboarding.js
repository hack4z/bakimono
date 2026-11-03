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

  let rpcResult = data;
  if (Array.isArray(data)) {
    rpcResult = data.length === 1 ? data[0] : data;
  }
  if (
    rpcResult
    && typeof rpcResult === "object"
    && !Array.isArray(rpcResult)
    && "provider_exists_for_current_user" in rpcResult
  ) {
    rpcResult = rpcResult.provider_exists_for_current_user;
  }
  if (!rpcResult || rpcResult === false) {
    return { providerExists: false, nextStep: "business" };
  }
  if (typeof rpcResult === "string") {
    const value = rpcResult.trim();
    if (!value || ["false", "no", "null"].includes(value.toLowerCase())) {
      return { providerExists: false, nextStep: "business" };
    }
    const step = normalizeProviderSignupStep(value);
    return {
      providerExists: true,
      nextStep: step === "complete" ? null : step || "business",
      complete: step === "complete",
    };
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
