import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import BrandBanner from "~/components/BrandBanner";
import LoadingState from "~/components/LoadingState";
import {
  ArrowRight,
  BedDouble,
  Heart,
  CookingPot,
  House,
  PackageOpen,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-solid";
import { getSupabaseErrorMessage, getUserAvatarUrl, normalizeKenyanPhone, uploadAvatar } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";
import { getProductCoverUrl } from "~/utils/product-images";
import { checkProfileCompletion, isProfileComplete } from "~/utils/profile-completion";

const categories = [
  { id: "all", label: "All options" },
  { id: "hotels", label: "Rooms" },
  { id: "tables", label: "Tables" },
  { id: "homes", label: "Home rentals" },
  { id: "food", label: "Food" },
];

const services = [
  {
    id: "tables",
    type: "tables",
    typeLabel: "Dining",
    name: "Book a table",
    detail: "Find a place to share a meal, from casual dining to a special occasion.",
    image: "photo-1414235077428-338989a2e8c0",
    Icon: Utensils,
  },
  {
    id: "rooms",
    type: "hotels",
    typeLabel: "Stays",
    name: "Book a room",
    detail: "Browse places to stay for a quick escape or a longer trip.",
    image: "photo-1611892440504-42a792e24d32",
    Icon: BedDouble,
  },
  {
    id: "home-rentals",
    type: "homes",
    typeLabel: "Home rentals",
    name: "Rent a home",
    detail: "Explore whole-home rentals with room to settle in.",
    image: "photo-1449158743715-0a90ebb6d2d8",
    Icon: House,
  },
  {
    id: "food",
    type: "food",
    typeLabel: "Delivery",
    name: "Order food",
    detail: "Choose a meal to enjoy at home or wherever you are.",
    image: "photo-1547592180-85f173990554",
    Icon: CookingPot,
  },
];

const localPhotos = {
  "photo-1517248135467-4c7edcad34c4": "/restaurant-hero.jpg",
  "photo-1611892440504-42a792e24d32": "/card-1.jpg",
  "photo-1414235077428-338989a2e8c0": "/card-2.jpg",
};

const imageUrl = (photo) =>
  localPhotos[photo]
  ?? `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=85`;

export default function DashboardPage() {
  const [activeCategory, setActiveCategory] = createSignal("all");
  const [query, setQuery] = createSignal("");
  const [favourites, setFavourites] = createSignal([]);
  const [user, setUser] = createSignal(null);
  const [verificationMessage, setVerificationMessage] = createSignal("");
  const [verificationError, setVerificationError] = createSignal("");
  const [isResendingVerification, setIsResendingVerification] = createSignal(false);
  const [profileComplete, setProfileComplete] = createSignal(false);
  const [profileStatus, setProfileStatus] = createSignal("loading");
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = createSignal(false);
  const [isSavingProfile, setIsSavingProfile] = createSignal(false);
  const [profileSaveError, setProfileSaveError] = createSignal("");
  const [profileSaveMessage, setProfileSaveMessage] = createSignal("");
  const [profileForm, setProfileForm] = createSignal({
    name: "",
    birthday: "",
    phone: "",
    city: "",
    address: "",
  });
  const [avatarFile, setAvatarFile] = createSignal(null);
  const [avatarPreview, setAvatarPreview] = createSignal("");
  const [favouritesLoading, setFavouritesLoading] = createSignal(true);
  const [favouritesError, setFavouritesError] = createSignal("");

  async function loadFavourites() {
    setFavouritesLoading(true);
    setFavouritesError("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!userData.user) {
        setUser(null);
        setProfileComplete(false);
        setProfileStatus("missing");
        setFavourites([]);
        return;
      }
      setUser(userData.user);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, birthday, phone, city, address")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      setProfileStatus(profile ? "exists" : "missing");
      setProfileForm({
        name: profile?.name ?? "",
        birthday: profile?.birthday ?? "",
        phone: String(profile?.phone ?? "").replace(/\D/g, "").replace(/^254/, "").replace(/^0/, "").slice(0, 9),
        city: profile?.city ?? "",
        address: profile?.address ?? "",
      });
      setAvatarPreview(await getUserAvatarUrl(userData.user.id));
      const completion = await checkProfileCompletion();
      setProfileComplete(isProfileComplete(completion));
      setProfileStatus(
        completion.status === "profile_complete" ? "complete"
          : completion.status === "profile_not_found" ? "missing"
            : "incomplete",
      );

      const { data: favouriteRows, error: favouriteError } = await supabase
        .from("favourites")
        .select("product_id, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (favouriteError) throw favouriteError;

      const rows = favouriteRows ?? [];
      const productIds = [...new Set(rows.map((favourite) => favourite.product_id))];
      if (productIds.length === 0) {
        setFavourites([]);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("product_id, provider_id, name, description, price, type")
        .in("product_id", productIds);

      if (productsError) throw productsError;

      const productsById = new Map((products ?? []).map((product) => [product.product_id, product]));
      setFavourites(await Promise.all(
        rows
          .map((favourite) => productsById.get(favourite.product_id))
          .filter(Boolean)
          .map(async (product) => ({
            ...product,
            coverUrl: await getProductCoverUrl(product.provider_id, product.product_id),
          })),
      ));
    } catch (error) {
      setProfileStatus("error");
      setFavouritesError(
        getSupabaseErrorMessage(error, "Unable to load your favourites right now."),
      );
    } finally {
      setFavouritesLoading(false);
    }
  }

  onMount(loadFavourites);

  const filteredServices = () => {
    const search = query().trim().toLowerCase();

    return services.filter((item) => {
      const matchesCategory = activeCategory() === "all" || item.type === activeCategory();
      const matchesSearch =
        !search ||
        `${item.name} ${item.detail} ${item.typeLabel}`.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  };

  function handleSearch(event) {
    event.preventDefault();
  }

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

  function openProfileDrawer() {
    setProfileSaveError("");
    setAvatarFile(null);
    setIsProfileDrawerOpen(true);
  }

  function selectAvatar(file) {
    const previousPreview = avatarPreview();
    if (previousPreview.startsWith("blob:")) URL.revokeObjectURL(previousPreview);
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : "");
  }

  onCleanup(() => {
    const preview = avatarPreview();
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  });

  async function saveProfile(event) {
    event.preventDefault();
    const form = profileForm();
    if (!user()) return;
    const normalizedPhone = normalizeKenyanPhone(`254${form.phone}`);
    if (!form.name.trim() || !form.birthday || !normalizedPhone || !form.city.trim() || !form.address.trim()) {
      setProfileSaveError("Please complete your details and enter the 9 digits after 254.");
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveError("");
    setProfileSaveMessage("");
    try {
      const file = avatarFile();
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Your avatar must be smaller than 5 MB.");
        await uploadAvatar(user().id, file);
      }

      const updates = {
        user_id: user().id,
        name: form.name.trim(),
        birthday: form.birthday,
        phone: normalizedPhone,
        city: form.city.trim(),
        address: form.address.trim(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("profiles").upsert(updates, { onConflict: "user_id" });
      if (error) throw error;
      setProfileComplete(true);
      setProfileStatus("complete");
      setProfileSaveMessage("Your profile was saved successfully.");
      setIsProfileDrawerOpen(false);
    } catch (error) {
      setProfileSaveError(getSupabaseErrorMessage(error, "Unable to save your profile."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-8 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1320px]">
        <BrandBanner
          eyebrow="Your Bakimono day"
          title="Good plans start here."
          description="Find a place to stay, a table to linger at, or something delicious."
        />

        <Show when={profileSaveMessage()}>
          <section role="status" class="mt-5 rounded-2xl border border-fern-500/40 bg-dry-sage-900 px-4 py-3 text-sm font-semibold text-hunter-green-500">
            {profileSaveMessage()}
          </section>
        </Show>

        <Show when={user() && !user().email_confirmed_at}>
          <section role="alert" class="mb-5 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-rose-400 bg-rose-50 p-5 text-rose-950 shadow-[0_12px_30px_rgba(225,29,72,0.12)] dark:bg-rose-950/40 dark:text-rose-50 sm:p-6">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-200">Email verification required</p>
              <h2 class="mt-1 font-serif text-2xl">Verify your email address</h2>
              <p class="mt-1 text-sm leading-6 text-rose-800 dark:text-rose-100">
                We sent a verification link to {user().email}. Open it to verify your account and keep using Bakimono.
              </p>
              <Show when={verificationMessage()}><p role="status" class="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-200">{verificationMessage()}</p></Show>
              <Show when={verificationError()}><p role="alert" class="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-200">{verificationError()}</p></Show>
            </div>
            <button type="button" onClick={resendVerificationEmail} disabled={isResendingVerification()} class="inline-flex h-11 shrink-0 items-center rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
              {isResendingVerification() ? "Sending…" : "Resend email"}
            </button>
          </section>
        </Show>

        <Show when={user() && ["missing", "incomplete"].includes(profileStatus())}>
          <section role="alert" class="mb-8 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dry-sage-700 bg-dry-sage-900 p-5 text-dust-grey-100 shadow-sm sm:p-6">
            <div class="flex items-start gap-3">
              <span class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-white">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-hunter-green-500">Action required</p>
                <h2 class="mt-1 font-serif text-2xl">Complete your signup before booking</h2>
                <p class="mt-1 max-w-2xl text-sm leading-6 text-dust-grey-200">
                  Add your name, birthday, phone number, city, and address in Settings. Checkout stays locked until your profile is complete.
                </p>
              </div>
            </div>
            <button type="button" onClick={openProfileDrawer} class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-bold text-white transition hover:bg-hunter-green-400">
              Complete profile <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        </Show>

        <Show when={!favouritesLoading() && !user()}>
          <section role="status" class="mb-8 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dry-sage-700 bg-dry-sage-900 p-5 text-dust-grey-100 shadow-sm sm:p-6">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-hunter-green-500">Sign in required</p>
              <h2 class="mt-1 font-serif text-2xl">Explore with your Bakimono account</h2>
              <p class="mt-1 max-w-2xl text-sm leading-6 text-dust-grey-200">
                Sign in to manage bookings and orders, or create an account to get started.
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <A href="/login" class="inline-flex h-11 items-center rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm font-bold text-dust-grey-100 transition hover:border-fern-500">
                Sign in
              </A>
              <A href="/signup" class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-bold text-white transition hover:bg-hunter-green-400">
                Sign up <ArrowRight size={16} aria-hidden="true" />
              </A>
            </div>
          </section>
        </Show>

        <Show when={isProfileDrawerOpen()}>
          <div class="fixed inset-0 z-60 bg-pine-teal-100/55 backdrop-blur-sm" role="presentation" onClick={(event) => {
            if (event.target === event.currentTarget && !isSavingProfile()) setIsProfileDrawerOpen(false);
          }}>
            <section role="dialog" aria-modal="true" aria-labelledby="dashboard-profile-title" class="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl">
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Action required</p>
                  <h2 id="dashboard-profile-title" class="mt-1 font-serif text-2xl text-dust-grey-100">Complete your profile</h2>
                </div>
                <button type="button" disabled={isSavingProfile()} onClick={() => setIsProfileDrawerOpen(false)} class="flex size-10 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text hover:bg-dust-grey-800 disabled:opacity-50">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <form class="flex flex-1 flex-col" onSubmit={saveProfile}>
                <div class="flex-1 space-y-4 p-5 sm:p-7">
                  <For each={[
                    ["name", "Full name", "text"],
                    ["birthday", "Birthday", "date"],
                    ["city", "City", "text"],
                    ["address", "Street address", "text"],
                  ]}>
                    {(field) => (
                      <label class="block text-sm font-medium text-dust-grey-200">
                        {field[1]}
                        <input
                          name={field[0]}
                          type={field[2]}
                          required
                          value={profileForm()[field[0]]}
                          onInput={(event) => setProfileForm((current) => ({
                            ...current,
                            [field[0]]: event.currentTarget.value,
                          }))}
                          class="mt-2 h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                        />
                      </label>
                    )}
                  </For>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Phone number
                    <div class="mt-2 flex overflow-hidden rounded-xl border border-dust-grey-600 bg-dust-grey-900 focus-within:border-fern-500">
                      <span class="flex h-12 shrink-0 items-center border-r border-dust-grey-600 px-3 text-sm font-semibold text-dust-grey-100">
                        254
                      </span>
                      <input
                        name="phone"
                        type="tel"
                        required
                        maxlength="9"
                        pattern="[17][0-9]{8}"
                        inputmode="numeric"
                        autocomplete="tel-national"
                        placeholder="712345678"
                        value={profileForm().phone}
                        onInput={(event) => setProfileForm((current) => ({
                          ...current,
                          phone: event.currentTarget.value.replace(/\D/g, "").slice(0, 9),
                        }))}
                        class="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-dust-grey-100 outline-none"
                      />
                    </div>
                    <p class="mt-1.5 text-xs text-dust-grey-400">Enter 9 digits starting with 7 or 1, without 0 or 254.</p>
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Avatar image
                    <Show when={avatarPreview()}>
                      <img src={avatarPreview()} alt="Selected avatar preview" class="mb-3 size-28 rounded-2xl border border-dry-sage-700 object-cover" width="112" height="112" />
                    </Show>
                    <input type="file" accept="image/*" onChange={(event) => selectAvatar(event.currentTarget.files?.[0] ?? null)} class="mt-2 min-h-32 w-full cursor-pointer rounded-2xl border-2 border-dashed border-dry-sage-700 bg-dry-sage-900 p-5 text-sm text-dust-grey-200 file:mr-4 file:rounded-lg file:border-0 file:bg-hunter-green-500 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:border-fern-500" />
                    <p class="mt-1 text-xs text-dust-grey-400">Choose an image up to 5 MB.</p>
                  </label>
                  <Show when={profileSaveError()}>
                    <p role="alert" class="rounded-xl border border-dust-grey-600 bg-dust-grey-800 px-4 py-3 text-sm text-dust-grey-200">{profileSaveError()}</p>
                  </Show>
                </div>
                <div class="sticky bottom-0 border-t border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-7">
                  <button type="submit" disabled={isSavingProfile()} class="flex h-12 w-full items-center justify-center rounded-xl bg-hunter-green-500 text-sm font-semibold text-white hover:bg-hunter-green-400 disabled:opacity-60">
                    {isSavingProfile() ? "Saving profile…" : "Save profile"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Show>

        <section class="relative overflow-hidden rounded-[30px] border border-dry-sage-700 bg-dry-sage-900 p-5 shadow-sm sm:p-7 lg:p-8">
          <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div class="relative">
              <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-dry-sage-700 bg-white/70 px-3 py-1.5 text-xs font-semibold text-hunter-green-500">
                <Sparkles size={14} aria-hidden="true" />
                LITTLE PLANS, LOVELY PLACES
              </div>
              <h2 class="max-w-xl font-serif text-3xl leading-[1.08] tracking-[-0.045em] text-dust-grey-100 sm:text-[42px]">
                Make today feel like <span class="text-hunter-green-500">somewhere.</span>
              </h2>
              <p class="mt-3 max-w-lg text-sm leading-6 text-dust-grey-200">
                Find a table, check into somewhere special, or let a great meal come to you.
              </p>

              <div class="mt-6 flex flex-wrap gap-2">
                <For each={categories}>
                  {(category) => (
                    <button
                      type="button"
                      aria-pressed={activeCategory() === category.id}
                      onClick={() => setActiveCategory(category.id)}
                      class={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        activeCategory() === category.id
                          ? "border-hunter-green-500 bg-hunter-green-500 text-white shadow-sm"
                          : "border-dry-sage-700 bg-white/60 text-dust-grey-200 hover:border-fern-500 hover:bg-white"
                      }`}
                    >
                      {category.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <div class="relative hidden min-h-[260px] overflow-hidden rounded-3xl bg-hunter-green-300 lg:block">
              <img
                src={imageUrl("photo-1414235077428-338989a2e8c0")}
                alt="A warmly lit table set for dinner"
                class="absolute inset-0 size-full object-cover"
              width="740" height="493" />
              <div class="absolute inset-0 bg-linear-to-t from-pine-teal-100/75 via-transparent to-transparent dark:from-[#0a0f0d]/80" />
              <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/90 p-3 backdrop-blur-md">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-fern-text">Stay · dine · enjoy</p>
                  <p class="mt-0.5 font-serif text-lg text-dust-grey-100">Choose your kind of day</p>
                </div>
                <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                  <Sparkles size={16} aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
          <form
            onSubmit={handleSearch}
            class="relative mt-7 flex flex-col gap-2 rounded-[22px] border border-dust-grey-600 bg-white p-2 text-dust-grey-100 shadow-[0_12px_32px_rgba(49,46,36,0.08)] sm:flex-row"
          >
            <label class="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3">
              <Search size={18} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input
                type="search"

                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder="What would you like to do?"
                class="w-full border-0 bg-transparent p-0 text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text"
              />
            </label>
            <button
              type="submit"
              class="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 sm:w-auto"
            >
              <Search size={17} aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>
        </section>

        <div class="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-text">Ways to enjoy Bakimono</p>
            <h2 class="mt-1 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-[30px]">
              What would you like to do?
            </h2>
          </div>
        </div>

        <section class="mt-5 grid grid-cols-2 gap-2.5 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <For each={filteredServices()}>
            {(item) => (
              <article class="group min-w-0 overflow-hidden rounded-2xl border border-dust-grey-600 bg-dust-grey-900 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-dry-sage-500 hover:shadow-xl hover:shadow-dust-grey-100/10 sm:rounded-3xl">
                <div class="relative aspect-[1.12] overflow-hidden bg-dry-sage-900 sm:aspect-[1.34]">
                  <img
                    src={imageUrl(item.image)}
                    alt=""
                    loading="lazy"
                    class="size-full object-cover transition duration-500 group-hover:scale-105"
                  width="1000" height="667" />
                </div>
                <div class="p-3 sm:p-4">
                  <div class="flex items-start gap-2 sm:items-center sm:gap-3">
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dry-sage-900 text-hunter-green-500 sm:size-10 sm:rounded-xl">
                      <item.Icon size={19} aria-hidden="true" />
                    </span>
                    <h3 class="font-serif text-sm leading-tight font-semibold tracking-[-0.02em] text-dust-grey-100 sm:text-[19px]">
                      {item.name}
                    </h3>
                  </div>
                  <p class="mt-3 line-clamp-3 text-xs leading-5 text-dust-grey-text sm:min-h-10 sm:line-clamp-none sm:text-sm">
                    {item.detail}
                  </p>
                  <div class="mt-4 flex items-center justify-end gap-2 border-t border-dust-grey-700 pt-3 sm:justify-between">
                    <span class="hidden text-xs font-medium text-dust-grey-text sm:inline">{item.typeLabel}</span>
                    <A
                      href="/explore"
                      class="inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-full bg-hunter-green-500 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-hunter-green-400 sm:w-auto sm:px-3 sm:text-xs"
                    >
                      Explore
                      <ArrowRight size={14} aria-hidden="true" />
                    </A>
                  </div>
                </div>
              </article>
            )}
          </For>
        </section>

        <Show when={filteredServices().length === 0}>
          <div class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center">
            <Search size={25} class="mx-auto text-dust-grey-text" aria-hidden="true" />
            <h3 class="mt-3 font-serif text-xl text-dust-grey-100">No matches just yet</h3>
            <p class="mt-1 text-sm text-dust-grey-text">Try a different search or loosen your filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("all");
              }}
              class="mt-4 text-sm font-semibold text-hunter-green-500 hover:underline"
            >
              Clear search and filters
            </button>
          </div>
        </Show>

        <section aria-labelledby="favourites-title" class="mt-12">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-text">Saved for later</p>
              <h2 id="favourites-title" class="mt-1 flex items-center gap-2 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-[30px]">
                <Heart size={22} aria-hidden="true" />
                Your favourites
              </h2>
            </div>
            <A href="/explore" class="inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
              Explore products <ArrowRight size={15} aria-hidden="true" />
            </A>
          </div>

          <Show when={favouritesLoading()}>
            <LoadingState class="mt-5" label="Loading your saved products…" />
          </Show>

          <Show when={!favouritesLoading() && favouritesError()}>
            <div role="alert" class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              <p>{favouritesError()}</p>
              <button type="button" onClick={loadFavourites} class="mt-2 font-semibold underline">
                Try again
              </button>
            </div>
          </Show>

          <Show when={!favouritesLoading() && !favouritesError() && favourites().length === 0}>
            <div class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
              <PackageOpen size={25} class="mx-auto text-dust-grey-text" aria-hidden="true" />
              <h3 class="mt-3 font-serif text-xl text-dust-grey-100">No favourites saved yet</h3>
              <p class="mt-1 text-sm text-dust-grey-text">Favourite products while exploring and they’ll show up here.</p>
              <A href="/explore" class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
                Browse products <ArrowRight size={15} aria-hidden="true" />
              </A>
            </div>
          </Show>

          <Show when={!favouritesLoading() && !favouritesError() && favourites().length > 0}>
            <div class="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <For each={favourites()}>
                {(product) => (
                  <article class="overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900 shadow-sm">
                    <Show when={product.coverUrl} fallback={
                      <div class="flex aspect-[1.34] w-full items-center justify-center bg-linear-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                        <PackageOpen size={34} class="text-dry-sage-300" aria-hidden="true" />
                      </div>
                    }>
                      <img src={product.coverUrl} alt={product.name || ""} loading="lazy" class="aspect-[1.34] w-full object-cover" width="800" height="600" />
                    </Show>
                    <div class="p-4">
                      <p class="text-xs font-medium capitalize text-dust-grey-text">{product.type || "Product"}</p>
                      <h3 class="mt-1 truncate font-serif text-lg font-semibold text-dust-grey-100">{product.name}</h3>
                      <p class="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-dust-grey-text">{product.description}</p>
                      <A
                        href={`/checkout/${product.product_id}`}
                        class="mt-4 inline-flex items-center gap-1 rounded-full bg-hunter-green-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-hunter-green-400"
                      >
                        View product <ArrowRight size={14} aria-hidden="true" />
                      </A>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </section>

        <footer class="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-pine-teal-800 bg-pine-teal-900 px-5 py-4 text-sm text-pine-teal-500">
          <span class="flex items-center gap-2 font-medium">
            <Sparkles size={16} aria-hidden="true" />
            Your next favorite moment is out there.
          </span>
          <a href="/explore" class="inline-flex items-center gap-1 font-semibold hover:underline">
            Explore all <ArrowRight size={15} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </main>
  );
}
