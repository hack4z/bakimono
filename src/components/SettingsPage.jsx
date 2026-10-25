import { A, useLocation } from "@solidjs/router";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { ArrowRight, CalendarDays, CircleHelp, Cookie, FileText, MapPin, Moon, Package, Pencil, Shield, Sun, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ThemeToggle from "~/components/ThemeToggle";
import { supabase } from "~/utils/supabase";

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const type = unordered ? "unordered-list" : "ordered-list";
      const items = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(
          type === "unordered-list" ? /^[-*+]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/,
        );
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type, items });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|```|>\s?|[-*+]\s+|\d+[.)]\s+)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function InlineMarkdown(props) {
  const tokens = () => {
    const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)]+)\)|\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
    const parts = [];
    let lastIndex = 0;

    for (const match of props.text.matchAll(pattern)) {
      const index = match.index;
      if (index > lastIndex) parts.push(props.text.slice(lastIndex, index));

      if (match[2] && match[3]) {
        parts.push(
          <a
            href={match[3]}
            target="_blank"
            rel="noreferrer"
            class="font-medium text-hunter-green-500 underline underline-offset-2"
          >
            {match[2]}
          </a>,
        );
      } else if (match[4] || match[5]) {
        parts.push(<strong class="font-semibold text-dust-grey-100">{match[4] ?? match[5]}</strong>);
      } else if (match[6]) {
        parts.push(<code class="rounded bg-dust-grey-700 px-1.5 py-0.5 text-[0.9em]">{match[6]}</code>);
      } else {
        parts.push(<em>{match[7] ?? match[8]}</em>);
      }

      lastIndex = index + match[0].length;
    }

    if (lastIndex < props.text.length) parts.push(props.text.slice(lastIndex));
    return parts;
  };

  return <>{tokens()}</>;
}

function MarkdownContent(props) {
  const blocks = () => parseMarkdown(props.markdown);

  return (
    <div class="mt-6 space-y-4 text-sm leading-7 text-dust-grey-200">
      <For each={blocks()}>
        {(block) => {
          if (block.type === "heading") {
            const headingClass =
              block.level === 1
                ? "mt-8 font-serif text-2xl text-dust-grey-100"
                : block.level === 2
                  ? "mt-7 font-serif text-xl text-dust-grey-100"
                  : "mt-5 font-semibold text-dust-grey-100";
            if (block.level === 1) return <h2 class={headingClass}><InlineMarkdown text={block.text} /></h2>;
            if (block.level === 2) return <h3 class={headingClass}><InlineMarkdown text={block.text} /></h3>;
            return <h4 class={headingClass}><InlineMarkdown text={block.text} /></h4>;
          }
          if (block.type === "unordered-list") {
            return (
              <ul class="list-disc space-y-2 pl-6 marker:text-fern-500">
                <For each={block.items}>{(item) => <li><InlineMarkdown text={item} /></li>}</For>
              </ul>
            );
          }
          if (block.type === "ordered-list") {
            return (
              <ol class="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-fern-500">
                <For each={block.items}>{(item) => <li><InlineMarkdown text={item} /></li>}</For>
              </ol>
            );
          }
          if (block.type === "quote") {
            return (
              <blockquote class="border-l-2 border-fern-500 pl-4 italic text-dust-grey-300">
                <InlineMarkdown text={block.text} />
              </blockquote>
            );
          }
          if (block.type === "code") {
            return <pre class="overflow-x-auto rounded-xl bg-dust-grey-800 p-4 text-xs leading-5 text-dust-grey-200"><code>{block.text}</code></pre>;
          }
          if (block.type === "rule") return <hr class="border-dust-grey-600" />;
          return <p><InlineMarkdown text={block.text} /></p>;
        }}
      </For>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = createSignal(null);
  const [profile, setProfile] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isDark, setIsDark] = createSignal(false);
  const [isEditingProfile, setIsEditingProfile] = createSignal(false);
  const [editForm, setEditForm] = createSignal({});
  const [isSavingProfile, setIsSavingProfile] = createSignal(false);
  const [profileSaveError, setProfileSaveError] = createSignal("");

  onMount(async () => {
    const syncTheme = (event) => setIsDark(event.detail);
    window.addEventListener("bakimono-theme-change", syncTheme);
    onCleanup(() => window.removeEventListener("bakimono-theme-change", syncTheme));
    setIsDark(document.documentElement.classList.contains("dark"));

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(data.user);
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("created_at, updated_at, user_id, orders, bookings, image, name, birthday, address, city")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load your profile.",
      );
    } finally {
      setIsLoading(false);
    }
  });

  const displayName = () => {
    if (profile()?.name) return profile().name;
    const metadata = user()?.user_metadata ?? {};
    return metadata.full_name ?? metadata.name ?? metadata.username ?? "Welcome to Bakimono";
  };

  const initials = () =>
    displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "B";

  const avatarUrl = () =>
    profile()?.image || user()?.user_metadata?.avatar_url || user()?.user_metadata?.picture;
  const formatProfileDate = (value, dateOnly = false) => {
    if (!value) return "Not provided";
    if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
        new Date(year, month - 1, day),
      );
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Not provided"
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          ...(dateOnly ? {} : { timeStyle: "short" }),
        }).format(date);
  };
  const orderCount = () => profile()?.orders?.length ?? 0;
  const bookingCount = () => profile()?.bookings?.length ?? 0;

  function openProfileEditor() {
    if (!profile()) return;
    setProfileSaveError("");
    setEditForm({
      name: profile().name ?? "",
      birthday: profile().birthday ?? "",
      address: profile().address ?? "",
      city: profile().city ?? "",
      image: profile().image ?? "",
    });
    setIsEditingProfile(true);
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!user() || !profile()) return;

    setProfileSaveError("");
    const form = editForm();
    if (!form.name.trim() || !form.birthday || !form.address.trim() || !form.city.trim()) {
      setProfileSaveError("Please complete your name, birthday, address, and city.");
      return;
    }

    setIsSavingProfile(true);

    try {
      const updates = {
        name: form.name.trim(),
        birthday: form.birthday,
        address: form.address.trim(),
        city: form.city.trim(),
        image: form.image.trim(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user().id)
        .select("created_at, updated_at, user_id, orders, bookings, image, name, birthday, address, city")
        .single();

      if (error) throw error;
      setProfile(data);
      setIsEditingProfile(false);
    } catch (error) {
      setProfileSaveError(
        error instanceof Error ? error.message : "Unable to save your profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1000px]">
        <BrandBanner
          eyebrow="Make it yours"
          title="Settings."
          description="Your account, appearance, and a little help when you need it."
        />

        <section
          role={profile() ? "button" : undefined}
          tabindex={profile() ? 0 : undefined}
          aria-label={profile() ? "Edit your profile" : "Your profile"}
          onClick={() => {
            if (profile()) openProfileEditor();
          }}
          onKeyDown={(event) => {
            if (profile() && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              openProfileEditor();
            }
          }}
          class="relative overflow-hidden rounded-[28px] border border-dry-sage-700 bg-gradient-to-br from-hunter-green-500 via-fern-500 to-pine-teal-500 p-5 text-white shadow-sm sm:p-8"
          classList={{
            "cursor-pointer transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500":
              Boolean(profile()),
          }}
        >
          <div class="absolute -right-10 -top-16 size-56 rounded-full border border-white/15" />
          <div class="absolute -bottom-28 right-24 size-64 rounded-full border border-white/10" />
          <div class="relative flex flex-wrap items-center gap-4 sm:gap-5">
            <div class="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/30 bg-white/15 text-2xl font-semibold shadow-sm backdrop-blur">
              <Show
                when={avatarUrl()}
                fallback={<span>{initials()}</span>}
              >
                {(src) => <img src={src()} alt="" class="size-full object-cover" />}
              </Show>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                Your profile
              </p>
              <Show when={!isLoading()} fallback={<p class="mt-1 text-sm text-white/80">Loading account…</p>}>
                <h2 class="mt-1 truncate font-serif text-2xl sm:text-3xl">{displayName()}</h2>
                <p class="mt-1 truncate text-sm text-white/80">
                  {user()?.email ?? "Sign in to connect your account"}
                </p>
              </Show>
              <Show when={errorMessage()}>
                <p role="alert" class="mt-1 text-sm text-white">{errorMessage()}</p>
              </Show>
            </div>
            <Show when={!isLoading() && !user()}>
              <A
                href="/login"
                onClick={(event) => event.stopPropagation()}
                class="relative inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900"
              >
                Sign in <ArrowRight size={15} aria-hidden="true" />
              </A>
            </Show>
          </div>
          <Show when={!isLoading() && profile()}>
            <div class="relative mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-white/80">
              <Pencil size={13} aria-hidden="true" />
              Click to edit profile
            </div>
          </Show>
          <Show when={!isLoading() && profile()}>
            <div class="relative mt-6 grid gap-3 border-t border-white/20 pt-5 sm:grid-cols-2">
              <div class="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
                <Package size={17} class="shrink-0 text-white/80" aria-hidden="true" />
                <div>
                  <p class="text-[11px] font-medium uppercase tracking-wide text-white/70">Orders</p>
                  <p class="text-lg font-semibold">{orderCount()}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
                <CalendarDays size={17} class="shrink-0 text-white/80" aria-hidden="true" />
                <div>
                  <p class="text-[11px] font-medium uppercase tracking-wide text-white/70">Bookings</p>
                  <p class="text-lg font-semibold">{bookingCount()}</p>
                </div>
              </div>
            </div>
            <dl class="relative mt-4 grid gap-x-6 gap-y-3 border-t border-white/20 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs text-white/70">Birthday</dt>
                <dd class="mt-0.5 font-medium">{formatProfileDate(profile().birthday, true)}</dd>
              </div>
              <div>
                <dt class="flex items-center gap-1 text-xs text-white/70">
                  <MapPin size={12} aria-hidden="true" /> City
                </dt>
                <dd class="mt-0.5 font-medium">{profile().city || "Not provided"}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-white/70">Address</dt>
                <dd class="mt-0.5 font-medium">{profile().address || "Not provided"}</dd>
              </div>
              <div>
                <dt class="text-xs text-white/70">Profile ID</dt>
                <dd class="mt-0.5 break-all font-medium">{profile().user_id}</dd>
              </div>
              <div>
                <dt class="text-xs text-white/70">Member since</dt>
                <dd class="mt-0.5 font-medium">{formatProfileDate(profile().created_at)}</dd>
              </div>
              <div>
                <dt class="text-xs text-white/70">Last profile update</dt>
                <dd class="mt-0.5 font-medium">{formatProfileDate(profile().updated_at)}</dd>
              </div>
            </dl>
          </Show>
          <Show when={!isLoading() && user() && !profile() && !errorMessage()}>
            <p class="relative mt-5 border-t border-white/20 pt-4 text-sm text-white/80">
              Profile details are not available yet.
            </p>
          </Show>
        </section>

        <Show when={isEditingProfile()}>
          <div
            class="product-drawer-backdrop fixed inset-0 z-[60] bg-pine-teal-100/55 backdrop-blur-sm"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget && !isSavingProfile()) {
                setIsEditingProfile(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-profile-title"
              class="product-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">
                    Your account
                  </p>
                  <h2 id="edit-profile-title" class="mt-1 font-serif text-2xl text-dust-grey-100">
                    Edit profile
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close profile editor"
                  disabled={isSavingProfile()}
                  onClick={() => setIsEditingProfile(false)}
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-300 transition hover:bg-dust-grey-800 disabled:opacity-50"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <form class="flex flex-1 flex-col" onSubmit={saveProfile}>
                <div class="flex-1 space-y-4 p-5 sm:p-7">
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Full name
                    <input
                      name="name"
                      type="text"
                      required
                      maxlength="120"
                      value={editForm().name}
                      onInput={(event) => updateEditField("name", event.currentTarget.value)}
                      class="mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                    />
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Birthday
                    <input
                      name="birthday"
                      type="date"
                      required
                      value={editForm().birthday}
                      onInput={(event) => updateEditField("birthday", event.currentTarget.value)}
                      class="mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                    />
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Street address
                    <input
                      name="address"
                      type="text"
                      required
                      maxlength="250"
                      value={editForm().address}
                      onInput={(event) => updateEditField("address", event.currentTarget.value)}
                      class="mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                    />
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    City
                    <input
                      name="city"
                      type="text"
                      required
                      maxlength="120"
                      value={editForm().city}
                      onInput={(event) => updateEditField("city", event.currentTarget.value)}
                      class="mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                    />
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Profile image URL
                    <input
                      name="image"
                      type="text"
                      maxlength="2048"
                      value={editForm().image}
                      onInput={(event) => updateEditField("image", event.currentTarget.value)}
                      class="mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                    />
                  </label>
                  <Show when={profileSaveError()}>
                    <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {profileSaveError()}
                    </p>
                  </Show>
                </div>
                <div class="sticky bottom-0 border-t border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-7">
                  <button
                    type="submit"
                    disabled={isSavingProfile()}
                    class="flex h-12 w-full items-center justify-center rounded-xl bg-hunter-green-500 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSavingProfile() ? "Saving profile…" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Show>

        <section class="mt-8">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">
            Preferences
          </p>
          <div class="overflow-hidden rounded-[24px] border border-dust-grey-600 bg-dust-grey-900">
            <div class="flex items-center gap-4 p-4 sm:p-5">
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                {isDark() ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="text-sm font-semibold text-dust-grey-100">Dark mode</h2>
                <p class="mt-1 text-xs text-dust-grey-300">
                  {isDark() ? "A softer look for low-light moments." : "Switch to a softer, low-light palette."}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>

        <section class="mt-8">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">
            Support &amp; information
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <A
              href="/terms-and-conditions"
              class="group flex items-center gap-4 rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <FileText size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Terms &amp; Conditions</span>
                <span class="mt-1 block text-xs text-dust-grey-300">Terms and service information.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-300 transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
            <A
              href="/help"
              class="group flex items-center gap-4 rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <CircleHelp size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Help</span>
                <span class="mt-1 block text-xs text-dust-grey-300">Find answers and support options.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-300 transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
            <A
              href="/privacy-policy"
              class="group flex items-center gap-4 rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <Shield size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Privacy Policy</span>
                <span class="mt-1 block text-xs text-dust-grey-300">How personal information is handled.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-300 transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
            <A
              href="/cookie-policy"
              class="group flex items-center gap-4 rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <Cookie size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Cookie Policy</span>
                <span class="mt-1 block text-xs text-dust-grey-300">Information about cookies and preferences.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-300 transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SettingsInfoPage() {
  const location = useLocation();
  const [policyMarkdown, setPolicyMarkdown] = createSignal("");
  const [isLoadingPolicy, setIsLoadingPolicy] = createSignal(false);
  const [policyError, setPolicyError] = createSignal("");
  let policyRequest = 0;
  const section = () => location.pathname.slice(1);
  const isTerms = () => section() === "terms-and-conditions";
  const isPrivacy = () => section() === "privacy-policy";
  const isCookie = () => section() === "cookie-policy";
  const policyFile = () => {
    if (isTerms()) return "terms_and_conditions.md";
    if (isPrivacy()) return "privacy_policy.md";
    if (isCookie()) return "cookie_policy.md";
    return "";
  };
  const title = () => {
    if (isTerms()) return "Terms & Conditions";
    if (isPrivacy()) return "Privacy Policy";
    if (isCookie()) return "Cookie Policy";
    return "Help";
  };
  const description = () => {
    if (isPrivacy()) return "The privacy policy for using Bakimono.";
    if (isCookie()) return "The cookie policy for using Bakimono.";
    if (isTerms()) return "The terms and conditions for using Bakimono.";
    return "Help resources and support information will be available here.";
  };

  createEffect(() => {
    const file = policyFile();
    if (!file) return;

    const request = ++policyRequest;
    setIsLoadingPolicy(true);
    setPolicyError("");
    setPolicyMarkdown("");

    void (async () => {
      try {
        const { data, error } = await supabase.storage
          .from("admin")
          .download(file);

        if (error) throw error;
        const markdown = await data.text();
        if (request === policyRequest) setPolicyMarkdown(markdown);
      } catch (error) {
        if (request === policyRequest) {
          setPolicyError(
            error instanceof Error
              ? error.message
              : `Unable to load ${title().toLowerCase()}.`,
          );
        }
      } finally {
        if (request === policyRequest) setIsLoadingPolicy(false);
      }
    })();

    onCleanup(() => {
      policyRequest += 1;
    });
  });

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-2xl">
        <A href="/settings" class="text-sm font-semibold text-hunter-green-500 hover:underline">
          ← Back to settings
        </A>
        <div class="mt-6">
          <BrandBanner
            eyebrow="Bakimono information"
            title={title()}
            description={description()}
          />
        </div>
        <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-9">
          <Show when={policyFile()}>
            <Show when={isLoadingPolicy()}>
              <p role="status" class="mt-6 text-sm text-dust-grey-300">
                Loading {title().toLowerCase()}…
              </p>
            </Show>
            <Show when={policyError()}>
              <p role="alert" class="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {policyError()}
              </p>
            </Show>
            <Show when={!isLoadingPolicy() && !policyError() && policyMarkdown()}>
              <MarkdownContent markdown={policyMarkdown()} />
            </Show>
            <Show when={!isLoadingPolicy() && !policyError() && !policyMarkdown()}>
              <p class="mt-6 text-sm text-dust-grey-300">
                This policy document is empty.
              </p>
            </Show>
          </Show>
          <Show when={!policyFile()}>
            <div class="flex items-center gap-4 text-dust-grey-200">
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <CircleHelp size={19} aria-hidden="true" />
              </span>
              <p class="text-sm leading-6">
                Help resources and support information will be available here.
              </p>
            </div>
          </Show>
        </section>
      </div>
    </main>
  );
}
