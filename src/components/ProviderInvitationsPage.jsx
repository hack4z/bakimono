import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { Mail, RefreshCw, ShieldCheck, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import LoadingState from "~/components/LoadingState";
import { getCurrentProvider } from "~/utils/provider-data";
import { supabase } from "~/utils/supabase-client";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClass(status) {
  switch (status?.toLowerCase()) {
    case "accepted":
      return "bg-fern-900 text-fern-200";
    case "revoked":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
    case "expired":
      return "bg-dust-grey-800 text-dust-grey-200";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  }
}

export default function ProviderInvitationsPage() {
  const [invitations, setInvitations] = createSignal([]);
  const [providerId, setProviderId] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");
  const [cancellingInvitationId, setCancellingInvitationId] = createSignal("");

  async function loadInvitations() {
    setLoading(true);
    setErrorMessage("");
    try {
      const currentProvider = await getCurrentProvider();
      setProviderId(currentProvider.providerId);
      const { data, error } = await supabase
        .from("provider_invitations")
        .select("entry_id, created_at, updated_at, email, role, provider_id, status, expires_at, accepted_at")
        .eq("provider_id", currentProvider.providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvitations(data ?? []);
    } catch (error) {
      setInvitations([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider invitations.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelInvitation(invitation) {
    if (cancellingInvitationId() || invitation.status !== "pending") return;
    setCancellingInvitationId(invitation.entry_id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { error } = await supabase.rpc("cancel_provider_invitation", {
        p_invitation_id: invitation.entry_id,
      });
      if (error) throw error;
      setInvitations((current) => current.map((item) =>
        item.entry_id === invitation.entry_id ? { ...item, status: "revoked" } : item,
      ));
      setSuccessMessage(`Invitation to ${invitation.email} was cancelled.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to cancel the invitation.");
    } finally {
      setCancellingInvitationId("");
    }
  }

  onMount(() => void loadInvitations());

  const pendingCount = createMemo(() =>
    invitations().filter((invitation) => invitation.status === "pending").length,
  );

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Invitations."
          description="Review invitations sent to join your provider workspace and cancel pending invitations."
        />
        <Show when={successMessage()}>
          <p role="status" class="mt-5 rounded-xl border border-fern-700 bg-fern-900 px-4 py-3 text-sm text-fern-200">
            {successMessage()}
          </p>
        </Show>
        <Show when={errorMessage()}>
          <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage()}
          </p>
        </Show>

        <section class="mt-6 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-dust-grey-700 px-4 py-4 sm:px-6">
            <div>
              <h2 class="font-serif text-xl">Invitation history</h2>
              <p class="mt-1 text-xs text-dust-grey-text">
                {loading()
                  ? "Loading invitations…"
                  : `${invitations().length} invitation${invitations().length === 1 ? "" : "s"} · ${pendingCount()} pending`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadInvitations()}
              disabled={loading() || Boolean(cancellingInvitationId()) || !providerId()}
              class="inline-flex h-9 items-center gap-2 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} class={loading() ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </button>
          </div>

          <Show when={loading()}>
            <LoadingState label="Loading invitations…" class="m-4" />
          </Show>
          <Show when={!loading()}>
            <Show when={invitations().length > 0} fallback={
              <div class="px-6 py-12 text-center">
                <span class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                  <Mail size={21} aria-hidden="true" />
                </span>
                <p class="mt-4 text-sm font-semibold text-dust-grey-100">No invitations yet</p>
                <p class="mt-1 text-sm text-dust-grey-text">Invitations sent from Staff or Partners will appear here.</p>
              </div>
            }>
              <div class="overflow-x-auto">
                <table class="w-full min-w-245 text-left text-sm">
                  <caption class="sr-only">Provider invitations</caption>
                  <thead class="bg-dry-sage-900 text-xs uppercase tracking-wide text-dust-grey-text">
                    <tr>
                      <th scope="col" class="px-4 py-3 font-semibold sm:px-6">Email</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Role</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Sent</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Expires</th>
                      <th scope="col" class="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-dust-grey-700">
                    <For each={invitations()}>{(invitation) => (
                      <tr class="text-dust-grey-100">
                        <td class="px-4 py-4 font-medium sm:px-6">{invitation.email}</td>
                        <td class="px-4 py-4 capitalize">{invitation.role}</td>
                        <td class="px-4 py-4">
                          <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(invitation.status)}`}>
                            {invitation.status}
                          </span>
                        </td>
                        <td class="whitespace-nowrap px-4 py-4">{formatDate(invitation.created_at)}</td>
                        <td class="whitespace-nowrap px-4 py-4">{formatDate(invitation.expires_at)}</td>
                        <td class="px-4 py-4 text-right">
                          <Show when={invitation.status === "pending"} fallback={
                            invitation.status === "accepted"
                              ? <span class="inline-flex items-center gap-1 text-xs font-medium text-fern-text"><ShieldCheck size={14} aria-hidden="true" /> Accepted</span>
                              : <span class="text-xs text-dust-grey-text">—</span>
                          }>
                            <button
                              type="button"
                              onClick={() => void cancelInvitation(invitation)}
                              disabled={Boolean(cancellingInvitationId())}
                              class="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-wait disabled:opacity-50"
                            >
                              <Show when={cancellingInvitationId() === invitation.entry_id} fallback={<X size={14} aria-hidden="true" />}>
                                <RefreshCw size={14} class="animate-spin" aria-hidden="true" />
                              </Show>
                              {cancellingInvitationId() === invitation.entry_id ? "Cancelling…" : "Cancel invitation"}
                            </button>
                          </Show>
                        </td>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </section>
      </div>
    </main>
  );
}
