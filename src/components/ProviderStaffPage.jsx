import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { ArrowDownUp, Ban, Check, LoaderCircle, Mail, Plus, RefreshCw, Search, UserPlus, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { supabase } from "~/utils/supabase-client";
import { getCurrentProvider } from "~/utils/provider-data";
import { getInvitationError } from "~/utils/provider-invitations";

const invitationRoles = ["accountant", "manager", "owner", "staff"];
const inputClass =
  "h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-900";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function statusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case "active":
    case "accepted":
      return "bg-fern-900 text-fern-200";
    case "pending":
    case "invited":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    case "inactive":
    case "rejected":
    case "disabled":
    case "banned":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
    default:
      return "bg-dry-sage-900 text-hunter-green-500";
  }
}

export default function ProviderStaffPage() {
  const [members, setMembers] = createSignal([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [roleFilter, setRoleFilter] = createSignal("all");
  const [sortBy, setSortBy] = createSignal("name-asc");
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [updatingMemberId, setUpdatingMemberId] = createSignal("");
  const [providerId, setProviderId] = createSignal("");
  const [inviteOpen, setInviteOpen] = createSignal(false);
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [inviteRole, setInviteRole] = createSignal("staff");
  const [inviteLoading, setInviteLoading] = createSignal(false);
  const [inviteError, setInviteError] = createSignal("");
  const [inviteSuccess, setInviteSuccess] = createSignal("");

  async function loadMembers() {
    setLoading(true);
    setErrorMessage("");
    try {
      const currentProvider = await getCurrentProvider();
      setProviderId(currentProvider.providerId);
      const { data, error } = await supabase
        .from("provider_members")
        .select("entry_id, created_at, updated_at, member_id, name, provider_id, role, phone, status")
        .eq("provider_id", currentProvider.providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMembers(data ?? []);
    } catch (error) {
      setMembers([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider team members.");
    } finally {
      setLoading(false);
    }
  }

  function openInvitation() {
    setInviteEmail("");
    setInviteRole("staff");
    setInviteError("");
    setInviteSuccess("");
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
    if (!invitationRoles.includes(inviteRole())) {
      setInviteError("Choose a valid team role.");
      return;
    }
    if (!providerId()) {
      setInviteError("Your provider workspace could not be identified. Refresh and try again.");
      return;
    }

    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const currentProvider = await getCurrentProvider();
      const { data, error } = await supabase.functions.invoke("create-invitation", {
        body: {
          email,
          role: inviteRole(),
          provider_id: currentProvider.providerId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInviteOpen(false);
      setInviteSuccess(`Invitation sent to ${email} as ${inviteRole()}.`);
    } catch (error) {
      setInviteError(await getInvitationError(error, "Unable to send the team invitation."));
    } finally {
      setInviteLoading(false);
    }
  }

  async function updateMemberStatus(member, status) {
    if (updatingMemberId()) return;
    setUpdatingMemberId(member.entry_id);
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc(
        status === "banned" ? "ban_member" : "unban_member",
        { p_member_id: member.member_id },
      );
      if (error) throw error;
      setMembers((current) => current.map((item) =>
        item.entry_id === member.entry_id ? { ...item, status } : item,
      ));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update member status.");
    } finally {
      setUpdatingMemberId("");
    }
  }

  onMount(() => void loadMembers());
  const roles = createMemo(() => [...new Set(members().map((member) => member.role.trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second)));
  const filteredMembers = createMemo(() => {
    const query = searchQuery().trim().toLowerCase();
    return members().filter((member) => {
      const matchesQuery = !query || [
        member.name,
        member.role,
        member.phone,
        member.member_id,
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesQuery && (roleFilter() === "all" || member.role === roleFilter());
    }).sort((first, second) => {
      if (sortBy() === "name-desc") return second.name.localeCompare(first.name);
      if (sortBy() === "role-asc") return first.role.localeCompare(second.role) || first.name.localeCompare(second.name);
      if (sortBy() === "newest") return new Date(second.created_at) - new Date(first.created_at);
      if (sortBy() === "oldest") return new Date(first.created_at) - new Date(second.created_at);
      return first.name.localeCompare(second.name);
    });
  });

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Staff."
          description="Invite teammates and manage the members associated with your provider workspace."
        />
        <Show when={inviteSuccess()}>
          <p role="status" class="mt-5 rounded-xl border border-fern-700 bg-fern-900 px-4 py-3 text-sm text-fern-200">{inviteSuccess()}</p>
        </Show>
        <Show when={errorMessage()}>
          <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>
        <section class="mt-6 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-dust-grey-700 px-4 py-4 sm:px-6">
            <div>
              <h2 class="font-serif text-xl">Staff directory</h2>
              <p class="mt-1 text-xs text-dust-grey-text">
                {loading() ? "Loading team members…" : `Showing ${filteredMembers().length} of ${members().length} staff member${members().length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div class="flex gap-2">
              <button type="button" onClick={openInvitation} disabled={!providerId() || loading()} class="inline-flex h-9 items-center gap-2 rounded-lg bg-hunter-green-500 px-3 text-xs font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60">
                <UserPlus size={14} aria-hidden="true" /> Add staff
              </button>
              <button type="button" onClick={() => void loadMembers()} disabled={loading()} class="inline-flex h-9 items-center gap-2 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 disabled:opacity-60">
                <RefreshCw size={14} class={loading() ? "animate-spin" : ""} aria-hidden="true" /> Refresh
              </button>
            </div>
          </div>
          <div class="grid gap-3 border-b border-dust-grey-700 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(16rem,1fr)_repeat(2,minmax(11rem,0.5fr))]">
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3">
              <Search size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input type="search" value={searchQuery()} onInput={(event) => setSearchQuery(event.currentTarget.value)} placeholder="Search name, role, or phone" class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text" />
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <span>Role</span>
              <select value={roleFilter()} onChange={(event) => setRoleFilter(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="all">All roles</option><For each={roles()}>{(role) => <option value={role}>{role}</option>}</For>
              </select>
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <ArrowDownUp size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <span>Sort</span>
              <select value={sortBy()} onChange={(event) => setSortBy(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="role-asc">Role A–Z</option><option value="newest">Newest added</option><option value="oldest">Oldest added</option>
              </select>
            </label>
          </div>
          <Show when={loading()}><p role="status" class="px-6 py-10 text-center text-sm text-dust-grey-text">Loading team members…</p></Show>
          <Show when={!loading() && filteredMembers().length === 0}>
            <p class="px-6 py-10 text-center text-sm text-dust-grey-text">{members().length ? "No staff match your search and filters." : "No team members are linked to this provider."}</p>
          </Show>
          <Show when={!loading() && filteredMembers().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1020px] text-left text-sm">
                <caption class="sr-only">Provider team members</caption>
                <thead class="bg-dry-sage-900 text-xs uppercase tracking-wide text-dust-grey-text">
                  <tr><th scope="col" class="px-4 py-3 font-semibold sm:px-6">Name</th><th scope="col" class="px-4 py-3 font-semibold">Role</th><th scope="col" class="px-4 py-3 font-semibold">Status</th><th scope="col" class="px-4 py-3 font-semibold">Phone</th><th scope="col" class="px-4 py-3 font-semibold">Member ID</th><th scope="col" class="px-4 py-3 font-semibold">Added</th><th scope="col" class="px-4 py-3 text-right font-semibold">Access</th></tr>
                </thead>
                <tbody class="divide-y divide-dust-grey-700">
                  <For each={filteredMembers()}>{(member) => (
                    <tr class="text-dust-grey-100">
                      <td class="px-4 py-4 font-semibold sm:px-6">{member.name || "Unnamed member"}</td>
                      <td class="px-4 py-4"><span class="rounded-full bg-dry-sage-900 px-2.5 py-1 text-xs font-medium text-hunter-green-500">{member.role}</span></td>
                      <td class="px-4 py-4"><span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(member.status ?? "")}`}>{member.status || "Unknown"}</span></td>
                      <td class="px-4 py-4">{member.phone || "—"}</td>
                      <td class="px-4 py-4 font-mono text-xs">{member.member_id}</td>
                      <td class="px-4 py-4">{formatDate(member.created_at)}</td>
                      <td class="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void updateMemberStatus(member, member.status?.toLowerCase() === "banned" ? "active" : "banned")}
                          disabled={Boolean(updatingMemberId())}
                          class={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50 ${member.status?.toLowerCase() === "banned" ? "border-fern-600 text-fern-300 hover:bg-fern-900 focus-visible:outline-fern-500" : "border-rose-300 text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-500"}`}
                        >
                          <Show when={updatingMemberId() === member.entry_id} fallback={member.status?.toLowerCase() === "banned" ? <Check size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}>
                            <LoaderCircle size={14} class="animate-spin" aria-hidden="true" />
                          </Show>
                          {updatingMemberId() === member.entry_id ? "Saving…" : member.status?.toLowerCase() === "banned" ? "Unban" : "Ban"}
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
              aria-labelledby="invite-staff-title"
              class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider team</p>
                  <h2 id="invite-staff-title" class="mt-1 font-serif text-2xl text-dust-grey-100">Invite a team member</h2>
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
                    Member email
                    <span class="relative mt-1 block">
                      <Mail size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hunter-green-500" aria-hidden="true" />
                      <input
                        class={inputClass + " pl-10"}
                        type="email"
                        autocomplete="email"
                        required
                        maxlength="254"
                        placeholder="name@example.com"
                        value={inviteEmail()}
                        disabled={inviteLoading()}
                        onInput={(event) => setInviteEmail(event.currentTarget.value)}
                      />
                    </span>
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Team role
                    <select
                      class={inputClass + " mt-1 capitalize"}
                      value={inviteRole()}
                      disabled={inviteLoading()}
                      onChange={(event) => setInviteRole(event.currentTarget.value)}
                    >
                      <For each={invitationRoles}>{(role) => <option value={role}>{role}</option>}</For>
                    </select>
                    <span class="mt-1 block text-xs text-dust-grey-text">Choose the role this member will have in your provider workspace.</span>
                  </label>
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
                    <Show when={inviteLoading()} fallback={<Plus size={16} aria-hidden="true" />}>
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
