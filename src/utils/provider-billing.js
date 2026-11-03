import { supabase } from "~/utils/supabase-client";

export async function getCurrentProviderWorkspace() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from("provider_members")
    .select("provider_id, status")
    .eq("member_id", authData.user.id);
  if (membershipError) throw membershipError;

  const membership = (memberships ?? []).find(
    (item) => item.status?.toLowerCase() !== "banned",
  ) ?? memberships?.[0];
  if (!membership?.provider_id) return null;

  const { data: provider, error: providerError } = await supabase
    .from("providers")
    .select("provider_id, step")
    .eq("provider_id", membership.provider_id)
    .maybeSingle();
  if (providerError) throw providerError;
  if (!provider) throw new Error("Your provider workspace could not be found.");

  return {
    providerId: provider.provider_id,
    onboardingComplete: provider.step === "complete",
    isBanned: membership.status?.toLowerCase() === "banned",
  };
}

export async function getProviderHasPaid(providerId) {
  if (!providerId) throw new Error("A provider ID is required to check payment status.");

  const { data, error } = await supabase.rpc("provider_has_paid", {
    p_provider_id: providerId,
  });
  if (error) throw error;

  if (typeof data === "boolean") return data;
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof data.provider_has_paid === "boolean"
  ) {
    return data.provider_has_paid;
  }
  throw new Error("The provider payment status response was invalid.");
}

export async function getCurrentProviderBillingStatus() {
  const workspace = await getCurrentProviderWorkspace();
  if (!workspace) return null;
  if (workspace.isBanned || !workspace.onboardingComplete) {
    return { ...workspace, hasPaid: false };
  }
  return {
    ...workspace,
    hasPaid: await getProviderHasPaid(workspace.providerId),
  };
}
