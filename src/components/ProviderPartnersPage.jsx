import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { ArrowDownUp, Ban, Check, LoaderCircle, Mail, RefreshCw, Search, UserRound, UserPlus, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { supabase } from "~/utils/supabase-client";
import { getCurrentProvider } from "~/utils/provider-data";
import { getInvitationError } from "~/utils/provider-invitations";

const inputClass =
  "h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-900";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function ProviderPartnersPage() {
  const [partners, setPartners] = createSignal([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [idTypeFilter, setIdTypeFilter] = createSignal("all");
  const [sortBy, setSortBy] = createSignal("newest");
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");
  const [providerId, setProviderId] = createSignal("");
  const [inviteOpen, setInviteOpen] = createSignal(false);
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [inviteLoading, setInviteLoading] = createSignal(false);
  const [inviteError, setInviteError] = createSignal("");
  const [updatingPartnerId, setUpdatingPartnerId] = createSignal("");

  async function loadPartners() {
    setLoading(true);
    setErrorMessage("");
    try {
      const { providerId } = await getCurrentProvider();
      setProviderId(providerId);
      const { data, error } = await supabase
        .from("provider_patners")
        .select("entry_id, created_at, updated_at, name, id_type, id_number, user_id, provider_id")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const partnerRows = data ?? [];
      const userIds = [...new Set(partnerRows.map((partner) => partner.user_id).filter(Boolean))];
      let memberByUserId = new Map();
      if (userIds.length) {
        const { data: members, error: membersError } = await supabase
          .from("provider_members")
          .select("member_id, status")
          .eq("provider_id", providerId)
          .in("member_id", userIds);
        if (membersError) throw membersError;
        memberByUserId = new Map((members ?? []).map((member) => [member.member_id, member]));
      }
      setPartners(partnerRows.map((partner) => ({
        ...partner,
        status: memberByUserId.get(partner.user_id)?.status ?? "",
      })));
    } catch (error) {
      setPartners([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider partner records.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePartnerStatus(partner, status) {
    if (!partner.user_id || updatingPartnerId()) return;
    setUpdatingPartnerId(partner.entry_id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { error } = await supabase.rpc(
        status === "banned" ? "ban_member" : "unban_member",
        { p_member_id: partner.user_id },
      );
      if (error) throw error;
      setPartners((current) => current.map((item) =>
        item.entry_id === partner.entry_id ? { ...item, status } : item,
      ));
      setSuccessMessage(`${partner.name || "Partner"} access ${status === "banned" ? "banned" : "restored"}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update partner status.");
    } finally {
      setUpdatingPartnerId("");
    }
  }

  function openInvitation() {
    setInviteEmail("");
    setInviteError("");
    setSuccessMessage("");
    setInviteOpen(true);
  }

  function closeInvitation() {
    if (inviteLoading()) return;
    setInviteOpen(false);
    setInviteError("");
  }

  async function sendInvitation(event) {
    event.preventDefault();
    if (inviteLoading()) return;
    const email = inviteEmail().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    if (!providerId()) {
      setInviteError("Your provider workspace could not be identified. Refresh and try again.");
      return;
    }

    setInviteLoading(true);
    setInviteError("");
    setSuccessMessage("");
    try {
      const currentProvider = await getCurrentProvider();
      const { data, error } = await supabase.functions.invoke("create-invitation", {
        body: {
          email,
          role: "partner",
          provider_id: currentProvider.providerId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInviteOpen(false);
      setSuccessMessage(`Partner invitation sent to ${email}.`);
    } catch (error) {
      setInviteError(await getInvitationError(error, "Unable to send the partner invitation."));
    } finally {
      setInviteLoading(false);
    }
  }

  onMount(() => void loadPartners());
  const idTypes = createMemo(() => [...new Set(partners().map((partner) => partner.id_type).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second)));
  const filteredPartners = createMemo(() => {
    const query = searchQuery().trim().toLowerCase();
    return partners().filter((partner) => {
      const matchesQuery = !query || [partner.name, partner.id_type, partner.id_number, partner.user_id]
        .some((value) => value?.toLowerCase().includes(query));
      return matchesQuery && (idTypeFilter() === "all" || partner.id_type === idTypeFilter());
    }).sort((first, second) => {
      if (sortBy() === "name-asc") return first.name.localeCompare(second.name);
      if (sortBy() === "name-desc") return second.name.localeCompare(first.name);
      if (sortBy() === "id-type-asc") return first.id_type.localeCompare(second.id_type);
      if (sortBy() === "id-number-asc") return first.id_number.localeCompare(second.id_number);
      if (sortBy() === "oldest") return new Date(first.created_at) - new Date(second.created_at);
      return new Date(second.created_at) - new Date(first.created_at);
    });
  });

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Partners."
          description="Invite partners to join your provider workspace."
        />
        <Show when={successMessage()}>
          <p role="status" class="mt-5 rounded-xl border border-fern-700 bg-fern-900 px-4 py-3 text-sm text-fern-200">{successMessage()}</p>
        </Show>
        <Show when={errorMessage()}>
          <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>
        <section class="mt-6 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-dust-grey-700 px-4 py-4 sm:px-6">
            <div>
              <h2 class="font-serif text-xl">Partners directory</h2>
              <p class="mt-1 text-xs text-dust-grey-text">
                {loading() ? "Loading partners…" : `Showing ${filteredPartners().length} of ${partners().length} partner${partners().length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div class="flex gap-2">
              <button type="button" onClick={openInvitation} disabled={!providerId() || loading()} class="inline-flex h-9 items-center gap-2 rounded-lg bg-hunter-green-500 px-3 text-xs font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60">
                <UserPlus size={14} aria-hidden="true" /> Invite partner
              </button>
              <button type="button" onClick={() => void loadPartners()} disabled={loading()} class="inline-flex h-9 items-center gap-2 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 disabled:opacity-60">
                <RefreshCw size={14} class={loading() ? "animate-spin" : ""} aria-hidden="true" /> Refresh
              </button>
            </div>
          </div>
          <div class="grid gap-3 border-b border-dust-grey-700 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(16rem,1fr)_repeat(2,minmax(11rem,0.5fr))]">
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3">
              <Search size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input type="search" value={searchQuery()} onInput={(event) => setSearchQuery(event.currentTarget.value)} placeholder="Search name or ID details" class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text" />
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <span>ID type</span>
              <select value={idTypeFilter()} onChange={(event) => setIdTypeFilter(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="all">All types</option><For each={idTypes()}>{(idType) => <option value={idType}>{idType}</option>}</For>
              </select>
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <ArrowDownUp size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <span>Sort</span>
              <select value={sortBy()} onChange={(event) => setSortBy(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="newest">Newest added</option><option value="oldest">Oldest added</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="id-type-asc">ID type A–Z</option><option value="id-number-asc">ID number</option>
              </select>
            </label>
          </div>
          <Show when={loading()}><p role="status" class="px-6 py-10 text-center text-sm text-dust-grey-text">Loading partners…</p></Show>
          <Show when={!loading() && filteredPartners().length === 0}>
            <div class="px-6 py-10 text-center">
              <p class="text-sm text-dust-grey-text">{partners().length ? "No partners match your search and filters." : "No partners have joined this provider yet."}</p>
              <Show when={!partners().length}>
                <button type="button" onClick={openInvitation} class="mt-4 inline-flex items-center gap-2 rounded-full bg-hunter-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-hunter-green-400">
                  <UserPlus size={15} aria-hidden="true" /> Invite your first partner
                </button>
              </Show>
            </div>
          </Show>
          <Show when={!loading() && filteredPartners().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full min-w-260 text-left text-sm">
                <caption class="sr-only">Provider partners</caption>
                <thead class="bg-dry-sage-900 text-xs uppercase tracking-wide text-dust-grey-text">
                  <tr><th scope="col" class="px-4 py-3 font-semibold sm:px-6">Name</th><th scope="col" class="px-4 py-3 font-semibold">ID type</th><th scope="col" class="px-4 py-3 font-semibold">ID number</th><th scope="col" class="px-4 py-3 font-semibold">Status</th><th scope="col" class="px-4 py-3 font-semibold">Added</th><th scope="col" class="px-4 py-3 text-right font-semibold">Access</th></tr>
                </thead>
                <tbody class="divide-y divide-dust-grey-700">
                  <For each={filteredPartners()}>{(partner) => (
                    <tr class="text-dust-grey-100">
                      <td class="px-4 py-4 font-semibold sm:px-6">
                        <span class="inline-flex items-center gap-2">
                          <span class="flex size-8 items-center justify-center rounded-full bg-pine-teal-900 text-pine-teal-300"><UserRound size={15} aria-hidden="true" /></span>
                          {partner.name}
                        </span>
                      </td>
                      <td class="px-4 py-4"><span class="inline-flex rounded-full bg-dry-sage-900 px-2.5 py-1 text-xs font-medium text-hunter-green-500">{partner.id_type}</span></td>
                      <td class="px-4 py-4 font-mono text-xs">{partner.id_number}</td>
                      <td class="px-4 py-4">
                        <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${partner.status?.toLowerCase() === "banned" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" : partner.status?.toLowerCase() === "active" ? "bg-fern-900 text-fern-200" : "bg-dry-sage-900 text-hunter-green-500"}`}>
                          {partner.status || "Not linked"}
                        </span>
                      </td>
                      <td class="px-4 py-4">{formatDate(partner.created_at)}</td>
                      <td class="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void updatePartnerStatus(partner, partner.status?.toLowerCase() === "banned" ? "active" : "banned")}
                          disabled={!partner.user_id || !partner.status || Boolean(updatingPartnerId())}
                          class={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${partner.status?.toLowerCase() === "banned" ? "border-fern-600 text-fern-300 hover:bg-fern-900 focus-visible:outline-fern-500" : "border-rose-300 text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-500"}`}
                        >
                          <Show when={updatingPartnerId() === partner.entry_id} fallback={partner.status?.toLowerCase() === "banned" ? <Check size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}>
                            <LoaderCircle size={14} class="animate-spin" aria-hidden="true" />
                          </Show>
                          {updatingPartnerId() === partner.entry_id ? "Saving…" : partner.status?.toLowerCase() === "banned" ? "Unban" : "Ban"}
                        </button>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          </Show>
        </section>
        <Show when={inviteOpen()}>
          <div
            class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-65 bg-pine-teal-100/55 backdrop-blur-sm"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeInvitation();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="invite-partner-title"
              class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider team</p>
                  <h2 id="invite-partner-title" class="mt-1 font-serif text-2xl text-dust-grey-100">Invite a partner</h2>
                  <p class="mt-1 text-sm text-dust-grey-text">They’ll receive an invitation at their email address.</p>
                </div>
                <button
                  type="button"

                  onClick={closeInvitation}
                  disabled={inviteLoading()}
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text transition hover:bg-dust-grey-800 disabled:opacity-50"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <form class="flex flex-1 flex-col" onSubmit={sendInvitation}>
                <div class="flex-1 space-y-5 p-5 sm:p-7">
                  <Show when={inviteError()}>
                    <p role="alert" class="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{inviteError()}</p>
                  </Show>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Partner email
                    <span class="relative mt-1 block">
                      <Mail size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hunter-green-500" aria-hidden="true" />
                      <input
                        class={`${inputClass} pl-10`}
                        type="email"
                        autocomplete="email"
                        required
                        maxlength="254"
                        placeholder="partner@example.com"
                        value={inviteEmail()}
                        disabled={inviteLoading()}
                        onInput={(event) => setInviteEmail(event.currentTarget.value)}
                      />
                    </span>
                  </label>
                  <p class="text-xs leading-5 text-dust-grey-text">
                    The invitation will be sent with the partner role for this provider workspace.
                  </p>
                </div>
                <div class="sticky bottom-0 flex justify-end gap-3 border-t border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-7">
                  <button
                    type="button"
                    onClick={closeInvitation}
                    disabled={inviteLoading()}
                    class="h-11 rounded-xl border border-dust-grey-600 px-4 text-sm font-semibold text-dust-grey-200 transition hover:bg-dust-grey-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading()}
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Show when={inviteLoading()} fallback={<UserPlus size={16} aria-hidden="true" />}>
                      <LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
                    </Show>
                    {inviteLoading() ? "Sending invitation…" : "Send invitation"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Show>
      </div>
    </main>
  );
}
