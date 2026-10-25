import { createSignal, For, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import BrandBanner from "~/components/BrandBanner";
import {
  ArrowRight,
  BedDouble,
  Bookmark,
  CookingPot,
  House,
  PackageOpen,
  Search,
  Sparkles,
  Utensils,
} from "lucide-solid";
import { getProductImageUrl } from "~/utils/product-images";
import { supabase } from "~/utils/supabase";

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

const imageUrl = (photo) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=85`;

export default function DashboardPage() {
  const [activeCategory, setActiveCategory] = createSignal("all");
  const [query, setQuery] = createSignal("");
  const [bookmarks, setBookmarks] = createSignal([]);
  const [bookmarksLoading, setBookmarksLoading] = createSignal(true);
  const [bookmarksError, setBookmarksError] = createSignal("");

  async function loadBookmarks() {
    setBookmarksLoading(true);
    setBookmarksError("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!userData.user) {
        setBookmarks([]);
        return;
      }

      const { data: bookmarkRows, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("product_id, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (bookmarkError) throw bookmarkError;

      const rows = bookmarkRows ?? [];
      const productIds = [...new Set(rows.map((bookmark) => bookmark.product_id))];
      if (productIds.length === 0) {
        setBookmarks([]);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("product_id, name, description, price, type, cover_image, images")
        .in("product_id", productIds);

      if (productsError) throw productsError;

      const productsById = new Map((products ?? []).map((product) => [product.product_id, product]));
      setBookmarks(
        rows
          .map((bookmark) => productsById.get(bookmark.product_id))
          .filter(Boolean),
      );
    } catch (error) {
      setBookmarksError(
        error instanceof Error ? error.message : "Unable to load your bookmarks right now.",
      );
    } finally {
      setBookmarksLoading(false);
    }
  }

  onMount(loadBookmarks);

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

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-8 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1320px]">
        <BrandBanner
          eyebrow="Your Bakimono day"
          title="Good plans start here."
          description="Find a place to stay, a table to linger at, or something delicious."
        />

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
            <div class="relative hidden min-h-[260px] overflow-hidden rounded-[24px] bg-hunter-green-300 lg:block">
              <img
                src={imageUrl("photo-1414235077428-338989a2e8c0")}
                alt="A warmly lit table set for dinner"
                class="absolute inset-0 size-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-pine-teal-100/75 via-transparent to-transparent dark:from-[#0a0f0d]/80" />
              <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/90 p-3 backdrop-blur-md">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-fern-500">Stay · dine · enjoy</p>
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
            class="relative mt-7 flex gap-2 rounded-[22px] border border-dust-grey-600 bg-white p-2 text-dust-grey-100 shadow-[0_12px_32px_rgba(49,46,36,0.08)]"
          >
            <label class="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3">
              <Search size={18} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search experiences"
                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder="What would you like to do?"
                class="w-full border-0 bg-transparent p-0 text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-300"
              />
            </label>
            <button
              type="submit"
              class="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              <Search size={17} aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>
        </section>

        <div class="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">Ways to enjoy Bakimono</p>
            <h2 class="mt-1 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-[30px]">
              What would you like to do?
            </h2>
          </div>
        </div>

        <section aria-label="Ways to book or order" class="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <For each={filteredServices()}>
            {(item) => (
              <article class="group overflow-hidden rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-dry-sage-500 hover:shadow-xl hover:shadow-dust-grey-100/10">
                <div class="relative aspect-[1.34] overflow-hidden bg-dry-sage-900">
                  <img
                    src={imageUrl(item.image)}
                    alt=""
                    loading="lazy"
                    class="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div class="p-4">
                  <div class="flex items-center gap-3">
                    <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                      <item.Icon size={19} aria-hidden="true" />
                    </span>
                    <h3 class="font-serif text-[19px] font-semibold tracking-[-0.02em] text-dust-grey-100">
                      {item.name}
                    </h3>
                  </div>
                  <p class="mt-3 min-h-10 text-sm leading-5 text-dust-grey-300">
                    {item.detail}
                  </p>
                  <div class="mt-4 flex items-center justify-between gap-2 border-t border-dust-grey-700 pt-3">
                    <span class="text-xs font-medium text-dust-grey-300">{item.typeLabel}</span>
                    <A
                      href="/explore"
                      class="inline-flex shrink-0 items-center gap-1 rounded-full bg-hunter-green-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-hunter-green-400"
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
            <Search size={25} class="mx-auto text-dust-grey-300" aria-hidden="true" />
            <h3 class="mt-3 font-serif text-xl text-dust-grey-100">No matches just yet</h3>
            <p class="mt-1 text-sm text-dust-grey-300">Try a different search or loosen your filters.</p>
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

        <section aria-labelledby="bookmarks-title" class="mt-12">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">Saved for later</p>
              <h2 id="bookmarks-title" class="mt-1 flex items-center gap-2 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-[30px]">
                <Bookmark size={22} aria-hidden="true" />
                Your favourites
              </h2>
            </div>
            <A href="/explore" class="inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
              Explore products <ArrowRight size={15} aria-hidden="true" />
            </A>
          </div>

          <Show when={bookmarksLoading()}>
            <div role="status" class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-8 text-center text-sm text-dust-grey-300">
              Loading your saved products…
            </div>
          </Show>

          <Show when={!bookmarksLoading() && bookmarksError()}>
            <div role="alert" class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              <p>{bookmarksError()}</p>
              <button type="button" onClick={loadBookmarks} class="mt-2 font-semibold underline">
                Try again
              </button>
            </div>
          </Show>

          <Show when={!bookmarksLoading() && !bookmarksError() && bookmarks().length === 0}>
            <div class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
              <PackageOpen size={25} class="mx-auto text-dust-grey-300" aria-hidden="true" />
              <h3 class="mt-3 font-serif text-xl text-dust-grey-100">No favourites saved yet</h3>
              <p class="mt-1 text-sm text-dust-grey-300">Bookmark products while exploring and they’ll show up here.</p>
              <A href="/explore" class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
                Browse products <ArrowRight size={15} aria-hidden="true" />
              </A>
            </div>
          </Show>

          <Show when={!bookmarksLoading() && !bookmarksError() && bookmarks().length > 0}>
            <div class="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <For each={bookmarks()}>
                {(product) => (
                  <article class="overflow-hidden rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 shadow-sm">
                    <img
                      src={getProductImageUrl(product)}
                      alt={product.name}
                      loading="lazy"
                      class="aspect-[1.34] w-full bg-dry-sage-900 object-cover"
                    />
                    <div class="p-4">
                      <p class="text-xs font-medium capitalize text-dust-grey-300">{product.type || "Product"}</p>
                      <h3 class="mt-1 truncate font-serif text-lg font-semibold text-dust-grey-100">{product.name}</h3>
                      <p class="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-dust-grey-300">{product.description}</p>
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
