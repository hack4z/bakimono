import { A, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { ArrowRight, CircleHelp, Clipboard, Cookie, Download, FileText, LogOut, MapPin, Moon, Pencil, Phone, QrCode, Share2, Shield, Sun, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import ThemeToggle from "~/components/ThemeToggle";
import { getSupabaseErrorMessage, getUserAvatarUrl, normalizeKenyanPhone, uploadAvatar } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";
import { checkProfileCompletion, isProfileComplete } from "~/utils/profile-completion";
import { getCurrentProvider } from "~/utils/provider-data";
import { providerStorageBucket } from "~/utils/provider-storage";

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
              <ul class="list-disc space-y-2 pl-6 marker:text-fern-text">
                <For each={block.items}>{(item) => <li><InlineMarkdown text={item} /></li>}</For>
              </ul>
            );
          }
          if (block.type === "ordered-list") {
            return (
              <ol class="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-fern-text">
                <For each={block.items}>{(item) => <li><InlineMarkdown text={item} /></li>}</For>
              </ol>
            );
          }
          if (block.type === "quote") {
            return (
              <blockquote class="border-l-2 border-fern-500 pl-4 italic text-dust-grey-text">
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
  const navigate = useNavigate();
  const [user, setUser] = createSignal(null);
  const [profile, setProfile] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isDark, setIsDark] = createSignal(false);
  const [isEditingProfile, setIsEditingProfile] = createSignal(false);
  const [editForm, setEditForm] = createSignal({});
  const [avatarFile, setAvatarFile] = createSignal(null);
  const [avatarPreview, setAvatarPreview] = createSignal("");
  const [isSavingProfile, setIsSavingProfile] = createSignal(false);
  const [profileSaveError, setProfileSaveError] = createSignal("");
  const [profileSaveMessage, setProfileSaveMessage] = createSignal("");
  const [verificationMessage, setVerificationMessage] = createSignal("");
  const [verificationError, setVerificationError] = createSignal("");
  const [isResendingVerification, setIsResendingVerification] = createSignal(false);
  const [profileIsComplete, setProfileIsComplete] = createSignal(false);
  const [isSigningOut, setIsSigningOut] = createSignal(false);
  const [signOutError, setSignOutError] = createSignal("");

  async function signOut() {
    if (isSigningOut()) return;
    setSignOutError("");
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(getSupabaseErrorMessage(error, "Unable to sign out."));
    } finally {
      setIsSigningOut(false);
    }
  }

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
          .select("entry_id, created_at, updated_at, user_id, name, birthday, address, city, phone")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);
        const completion = await checkProfileCompletion();
        setProfileIsComplete(isProfileComplete(completion));
        setAvatarPreview(await getUserAvatarUrl(data.user.id));
      }
    } catch (error) {
      setErrorMessage(
        getSupabaseErrorMessage(error, "Unable to load your profile."),
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
    avatarPreview() || user()?.user_metadata?.avatar_url || user()?.user_metadata?.picture;
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
  const profileComplete = () => profileIsComplete();

  async function resendVerificationEmail() {
    if (!user()?.email || isResendingVerification()) return;
    setVerificationMessage("");
    setVerificationError("");
    setIsResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user().email,
      });
      if (error) throw error;
      setVerificationMessage("A new verification email has been sent. Check your inbox.");
    } catch (error) {
      setVerificationError(getSupabaseErrorMessage(error, "Unable to resend the verification email."));
    } finally {
      setIsResendingVerification(false);
    }
  }

  function openProfileEditor() {
    setProfileSaveError("");
    setProfileSaveMessage("");
    setAvatarFile(null);
    setAvatarPreview(avatarPreview() || user()?.user_metadata?.avatar_url || user()?.user_metadata?.picture || "");
    setEditForm({
      name: profile()?.name ?? "",
      birthday: profile()?.birthday ?? "",
      address: profile()?.address ?? "",
      city: profile()?.city ?? "",
      phone: profile()?.phone ?? "",
      avatar: profile()?.avatar ?? "",
    });
    setIsEditingProfile(true);
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function selectAvatar(file) {
    const previousPreview = avatarPreview();
    if (previousPreview.startsWith("blob:")) URL.revokeObjectURL(previousPreview);
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : avatarPreview());
  }

  onCleanup(() => {
    const preview = avatarPreview();
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  });

  async function saveProfile(event) {
    event.preventDefault();
    if (!user()) return;

    setProfileSaveError("");
    setProfileSaveMessage("");
    const form = editForm();
    const normalizedPhone = normalizeKenyanPhone(form.phone);
    if (!form.name.trim() || !form.birthday || !normalizedPhone || !form.address.trim() || !form.city.trim()) {
      setProfileSaveError("Please complete your details and use a valid phone number starting with 254.");
      return;
    }

    setIsSavingProfile(true);

    try {
      const file = avatarFile();
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Your avatar must be smaller than 5 MB.");
        }

        await uploadAvatar(user().id, file);
      }

      const updates = {
        name: form.name.trim(),
        birthday: form.birthday,
        address: form.address.trim(),
        city: form.city.trim(),
        phone: normalizedPhone,
        updated_at: new Date().toISOString(),
      };
      const query = supabase
        .from("profiles")
        .upsert({ user_id: user().id, ...updates }, { onConflict: "user_id" })
        .select("entry_id, created_at, updated_at, user_id, name, birthday, address, city, phone")
        .single();
      const { data, error } = await query;

      if (error) throw error;
      setProfile(data);
      const completion = await checkProfileCompletion();
      setProfileIsComplete(isProfileComplete(completion));
      setProfileSaveMessage("Your profile was saved successfully.");
      setIsEditingProfile(false);
    } catch (error) {
      setProfileSaveError(
        getSupabaseErrorMessage(error, "Unable to save your profile."),
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

        <Show when={profileSaveMessage()}>
          <section role="status" class="mt-5 rounded-2xl border border-fern-500/40 bg-dry-sage-900 px-4 py-3 text-sm font-semibold text-hunter-green-500">
            {profileSaveMessage()}
          </section>
        </Show>

        <Show when={!isLoading() && user() && !user().email_confirmed_at}>
          <section role="alert" class="mb-5 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-rose-400 bg-rose-50 px-4 py-4 text-sm text-rose-950 shadow-[0_12px_30px_rgba(225,29,72,0.12)] dark:bg-rose-950/40 dark:text-rose-50">
            <div>
              <p class="font-semibold">Verify your email address</p>
              <p class="mt-1 leading-6 text-rose-800 dark:text-rose-100">Check {user().email} for your verification link before continuing.</p>
              <Show when={verificationMessage()}><p role="status" class="mt-1 font-semibold text-rose-700 dark:text-rose-200">{verificationMessage()}</p></Show>
              <Show when={verificationError()}><p role="alert" class="mt-1 font-semibold text-rose-700 dark:text-rose-200">{verificationError()}</p></Show>
            </div>
            <button type="button" onClick={resendVerificationEmail} disabled={isResendingVerification()} class="inline-flex h-10 shrink-0 items-center rounded-xl bg-rose-600 px-4 font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              {isResendingVerification() ? "Sending…" : "Resend email"}
            </button>
          </section>
        </Show>

        <section
          role={user() ? "button" : undefined}
          tabindex={user() ? 0 : undefined}
          aria-label={user() ? "Edit your profile" : "Your profile"}
          onClick={() => {
            if (user()) openProfileEditor();
          }}
          onKeyDown={(event) => {
            if (user() && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              openProfileEditor();
            }
          }}
          class="relative overflow-hidden rounded-7 border border-dry-sage-700 bg-linear-to-br from-hunter-green-500 via-fern-500 to-pine-teal-500 p-4 text-white shadow-sm sm:p-6"
          classList={{
            "cursor-pointer transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500":
              Boolean(user()),
          }}
        >
          <div class="absolute -right-10 -top-16 size-56 rounded-full border border-white/15" />
          <div class="absolute -bottom-28 right-24 size-64 rounded-full border border-white/10" />
          <div class="relative flex flex-wrap items-center gap-3">
            <div class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/40 bg-white/15 text-3xl font-semibold shadow-lg backdrop-blur sm:size-28">
              <Show
                when={avatarUrl()}
                fallback={<span>{initials()}</span>}
              >
                {(src) => <img src={src()} alt="" class="size-full object-cover" width="800" height="600" />}
              </Show>
            </div>
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                Your profile
                <Show when={!isLoading() && user()}>
                  <Pencil size={11} aria-hidden="true" />
                  <span class="normal-case tracking-normal">Edit</span>
                </Show>
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
            <dl class="relative mt-3 grid grid-cols-1 gap-2 border-t border-white/20 pt-3 text-sm sm:grid-cols-2">
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="truncate text-xs leading-4 text-white/70">Birthday</dt>
                <dd class="mt-1 truncate font-medium leading-5">{formatProfileDate(profile().birthday, true)}</dd>
              </div>
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="flex items-center gap-1 text-xs leading-4 text-white/70">
                  <Phone size={12} aria-hidden="true" /> Phone
                </dt>
                <dd class="mt-1 truncate font-medium leading-5" title={profile().phone || "Not provided"}>{profile().phone || "Not provided"}</dd>
              </div>
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="flex items-center gap-1 text-xs leading-4 text-white/70">
                  <MapPin size={12} aria-hidden="true" /> City
                </dt>
                <dd class="mt-1 truncate font-medium leading-5" title={profile().city || "Not provided"}>{profile().city || "Not provided"}</dd>
              </div>
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="truncate text-xs leading-4 text-white/70">Address</dt>
                <dd class="mt-1 truncate font-medium leading-5" title={profile().address || "Not provided"}>{profile().address || "Not provided"}</dd>
              </div>
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="truncate text-xs leading-4 text-white/70">Profile ID</dt>
                <dd class="mt-1 truncate font-medium leading-5" title={profile().user_id}>{profile().user_id}</dd>
              </div>
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="truncate text-xs leading-4 text-white/70">Member since</dt>
                <dd class="mt-1 truncate font-medium leading-5">{formatProfileDate(profile().created_at)}</dd>
              </div>
              <div class="min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <dt class="truncate text-xs leading-4 text-white/70">Last profile update</dt>
                <dd class="mt-1 truncate font-medium leading-5">{formatProfileDate(profile().updated_at)}</dd>
              </div>
            </dl>
          </Show>
          <Show when={!isLoading() && user() && !profileComplete() && !errorMessage()}>
            <p class="relative mt-5 border-t border-white/20 pt-4 text-sm text-white/80">
              Complete your profile to unlock bookings, orders, and other account features.
            </p>
          </Show>
        </section>

        <Show when={!isLoading() && user() && !profile() && !errorMessage()}>
          <section role="status" class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dry-sage-700 bg-dry-sage-900 px-4 py-4 text-sm text-dust-grey-100 shadow-sm">
            <div>
              <p class="font-semibold">Complete your signup</p>
              <p class="mt-1 leading-6">Add your name, birthday, phone number, city, and address in your profile to use bookings, orders, and other account features.</p>
            </div>
            <button type="button" onClick={openProfileEditor} class="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-semibold text-white hover:bg-hunter-green-400">
              Complete profile <ArrowRight size={15} aria-hidden="true" />
            </button>
          </section>
        </Show>

        <Show when={isEditingProfile()}>
          <div
            class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-60 bg-pine-teal-100/55 backdrop-blur-sm"
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
              class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div class="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">
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
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text transition hover:bg-dust-grey-800 disabled:opacity-50"
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
                    Avatar image
                    <input
                      name="avatar"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        selectAvatar(file);
                      }}
                      class="mt-2 min-h-32 w-full cursor-pointer rounded-2xl border-2 border-dashed border-dry-sage-700 bg-dry-sage-900 p-5 text-sm text-dust-grey-200 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-hunter-green-500 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:border-fern-500"
                    />
                    <Show when={avatarPreview()}>
                      <img src={avatarPreview()} alt="Selected avatar preview" class="mt-3 size-28 rounded-2xl border border-dry-sage-700 object-cover" width="112" height="112" />
                    </Show>
                    <p class="mt-1 text-xs text-dust-grey-400">Choose a PNG, JPG, WEBP, or GIF up to 5 MB.</p>
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      required
                      inputmode="tel"
                      maxlength="12"
                      pattern="254[17][0-9]{8}"
                      value={editForm().phone}
                      onInput={(event) => updateEditField("phone", event.currentTarget.value.replace(/\D/g, "").slice(0, 12))}
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
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">
            Preferences
          </p>
          <div class="overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
            <div class="flex items-center gap-4 p-4 sm:p-5">
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                {isDark() ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="text-sm font-semibold text-dust-grey-100">Dark mode</h2>
                <p class="mt-1 text-xs text-dust-grey-text">
                  {isDark() ? "A softer look for low-light moments." : "Switch to a softer, low-light palette."}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>

        <Show when={user()}>
          <section class="mt-8">
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Account</p>
            <div class="flex flex-col gap-4 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
              <Show when={signOutError()}>
                <p role="alert" class="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{signOutError()}</p>
              </Show>
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <LogOut size={19} aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="text-sm font-semibold text-dust-grey-100">Sign out of your account</h2>
                <p class="mt-1 text-xs leading-5 text-dust-grey-text">End this session securely and return to sign in.</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={isSigningOut()}
                class="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                <LogOut size={17} aria-hidden="true" />
                {isSigningOut() ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </section>
        </Show>

        <section class="mt-8">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">
            Support &amp; information
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <A
              href="/terms-and-conditions"
              class="group flex items-center gap-4 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <FileText size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Terms &amp; Conditions</span>
                <span class="mt-1 block text-xs text-dust-grey-text">Terms and service information.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-text transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
            <A
              href="/help"
              class="group flex items-center gap-4 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <CircleHelp size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Help</span>
                <span class="mt-1 block text-xs text-dust-grey-text">Find answers and support options.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-text transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
            <A
              href="/privacy-policy"
              class="group flex items-center gap-4 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <Shield size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Privacy Policy</span>
                <span class="mt-1 block text-xs text-dust-grey-text">How personal information is handled.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-text transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
            <A
              href="/cookie-policy"
              class="group flex items-center gap-4 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 transition hover:border-dry-sage-500 hover:shadow-sm sm:p-5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                <Cookie size={19} aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-dust-grey-100">Cookie Policy</span>
                <span class="mt-1 block text-xs text-dust-grey-text">Information about cookies and preferences.</span>
              </span>
              <ArrowRight size={17} class="shrink-0 text-dust-grey-text transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
            </A>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ProviderSettingsPage() {
  const sections = [
    {
      href: "/provider/settings/qr-code",
      title: "QR Code",
      description: "View and share your provider QR code.",
      Icon: QrCode,
    },
    {
      href: "/provider/settings/preferences",
      title: "Preferences",
      description: "Choose your appearance and manage workspace preferences.",
      Icon: Moon,
    },
    {
      href: "/provider/settings/terms-and-conditions",
      title: "Terms & Conditions",
      description: "Review the terms for using Bakimono.",
      Icon: FileText,
    },
    {
      href: "/provider/settings/privacy-policy",
      title: "Privacy Policy",
      description: "Learn how personal information is handled.",
      Icon: Shield,
    },
    {
      href: "/provider/settings/help",
      title: "Help",
      description: "Find answers and support information.",
      Icon: CircleHelp,
    },
  ];

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1000px]">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Settings."
          description="Manage preferences, review our policies, or get help."
        />
        <nav aria-label="Provider settings sections" class="mt-8 grid gap-3 sm:grid-cols-2">
          <For each={sections}>
            {({ href, title, description, Icon }) => (
              <A
                href={href}
                class="group flex min-h-28 items-center gap-4 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-5 transition hover:border-dry-sage-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
              >
                <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-semibold text-dust-grey-100">{title}</span>
                  <span class="mt-1 block text-sm leading-5 text-dust-grey-text">{description}</span>
                </span>
                <ArrowRight size={17} class="shrink-0 text-dust-grey-text transition group-hover:translate-x-1 group-hover:text-hunter-green-500" aria-hidden="true" />
              </A>
            )}
          </For>
        </nav>
      </div>
    </main>
  );
}

export function ProviderSettingsQrCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = createSignal("");
  const [qrCodeLoading, setQrCodeLoading] = createSignal(true);
  const [qrCodeAction, setQrCodeAction] = createSignal("");

  onMount(async () => {
    try {
      const { providerId } = await getCurrentProvider();
      const { data: files, error } = await supabase.storage
        .from(providerStorageBucket)
        .list(providerId, { limit: 100, search: "qr_code.png" });

      if (error) throw error;
      if ((files ?? []).some((file) => file.name === "qr_code.png")) {
        setQrCodeUrl(
          supabase.storage
            .from(providerStorageBucket)
            .getPublicUrl(`${providerId}/qr_code.png`).data.publicUrl,
        );
      }
    } catch {
      setQrCodeUrl("");
    } finally {
      setQrCodeLoading(false);
    }
  });

  const fetchQrCodeFile = async () => {
    const response = await fetch(qrCodeUrl());
    if (!response.ok) throw new Error("The QR code could not be downloaded.");
    return new File([await response.blob()], "provider-qr-code.png", { type: "image/png" });
  };

  const copyQrCode = async () => {
    setQrCodeAction("");
    try {
      await navigator.clipboard.writeText(qrCodeUrl());
      setQrCodeAction("QR code URL copied.");
    } catch {
      setQrCodeAction("Unable to copy the QR code.");
    }
  };

  const shareQrCode = async () => {
    setQrCodeAction("");
    try {
      const file = await fetchQrCodeFile();
      const data = { files: [file], title: "Provider QR code" };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Provider QR code", url: qrCodeUrl() });
        return;
      }
      await navigator.clipboard.writeText(qrCodeUrl());
      setQrCodeAction("Sharing is unavailable. The QR code link was copied.");
    } catch (error) {
      if (error?.name !== "AbortError") setQrCodeAction("Unable to share the QR code.");
    }
  };

  const downloadQrCode = async () => {
    setQrCodeAction("");
    try {
      const file = await fetchQrCodeFile();
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setQrCodeAction("QR code downloaded.");
    } catch {
      setQrCodeAction("Unable to download the QR code.");
    }
  };

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1000px]">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="QR Code."
          description="Share your provider storefront with customers."
        />
        <section class="mt-8 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-6">
          <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div class="flex min-h-72 w-full shrink-0 items-center justify-center rounded-2xl border border-dust-grey-600 bg-white p-6 sm:w-72">
              <Show when={!qrCodeLoading()}>
                <Show
                  when={qrCodeUrl()}
                  fallback={<p class="text-center text-sm text-dust-grey-text">No QR code available.</p>}
                >
                  {(url) => (
                    <img src={url()} alt="Provider QR code" class="size-full max-h-60 max-w-60 object-contain" width="240" height="600" />
                  )}
                </Show>
              </Show>
              <Show when={qrCodeLoading()}>
                <p class="text-sm text-dust-grey-text">Loading QR code…</p>
              </Show>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-hunter-green-500">Provider QR code</p>
              <h2 class="mt-2 font-serif text-2xl text-dust-grey-100">Share your provider.</h2>
              <p class="mt-2 max-w-xl text-sm leading-6 text-dust-grey-text">
                Customers can scan this code to open your provider storefront.
              </p>
              <div class="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!qrCodeUrl()}
                  onClick={copyQrCode}
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-dry-sage-900 px-4 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clipboard size={18} aria-hidden="true" />
                  Copy
                </button>
                <button
                  type="button"
                  disabled={!qrCodeUrl()}
                  onClick={shareQrCode}
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 size={18} aria-hidden="true" />
                  Share
                </button>
                <button
                  type="button"
                  disabled={!qrCodeUrl()}
                  onClick={downloadQrCode}
                  class="inline-flex h-11 items-center gap-2 rounded-xl border border-dust-grey-600 px-4 text-sm font-semibold text-dust-grey-100 transition hover:bg-dust-grey-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={18} aria-hidden="true" />
                  Download
                </button>
              </div>
              <Show when={qrCodeAction()}>
                {(message) => <p role="status" class="mt-3 text-sm text-dust-grey-text">{message()}</p>}
              </Show>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ProviderSettingsPreferencesPage() {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    const syncTheme = (event) => setIsDark(event.detail);
    window.addEventListener("bakimono-theme-change", syncTheme);
    onCleanup(() => window.removeEventListener("bakimono-theme-change", syncTheme));
    setIsDark(document.documentElement.classList.contains("dark"));
  });

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1000px]">
        <ProviderSignupBanner />
        <A href="/provider/settings" class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 hover:underline">
          <ArrowRight size={15} class="rotate-180" aria-hidden="true" />
          Back to provider settings
        </A>
        <BrandBanner
          eyebrow="Provider workspace"
          title="Preferences."
          description="Choose the appearance that works best for you."
        />
        <section class="mt-8 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
          <div class="flex items-center gap-4 p-4 sm:p-5">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
              {isDark() ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-semibold text-dust-grey-100">Dark mode</h2>
              <p class="mt-1 text-xs text-dust-grey-text">
                {isDark() ? "A softer look for low-light moments." : "Switch to a softer, low-light palette."}
              </p>
            </div>
            <ThemeToggle />
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
  const isProviderSettings = () => location.pathname.startsWith("/provider/settings/");
  const settingsHref = () => isProviderSettings() ? "/provider/settings" : "/settings";
  const section = () => location.pathname.split("/").filter(Boolean).at(-1) ?? "";
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
          .from("bakimono")
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
        <Show when={location.pathname.startsWith("/provider/")}>
          <ProviderSignupBanner />
        </Show>
        <A href={settingsHref()} class="text-sm font-semibold text-hunter-green-500 hover:underline">
          ← Back to settings
        </A>
        <div class="mt-6">
          <BrandBanner
            eyebrow="Bakimono information"
            title={title()}
            description={description()}
          />
        </div>
        <section class="rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-9">
          <Show when={policyFile()}>
            <Show when={isLoadingPolicy()}>
              <p role="status" class="mt-6 text-sm text-dust-grey-text">
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
              <p class="mt-6 text-sm text-dust-grey-text">
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
