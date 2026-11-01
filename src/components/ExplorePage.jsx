import { A, useSearchParams } from "@solidjs/router";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { ArrowRight, Heart, PackageSearch, Search, Star, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import LoadingState from "~/components/LoadingState";
import { supabase } from "~/utils/supabase";
import { getProductCoverUrl } from "~/utils/product-images";

function formatPrice(price) {
  const amount = Number(price);
  return Number.isFinite(amount)
    ? `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(Math.round(amount))}`
    : "KSh 0";
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = createSignal([]);
  const [activeType, setActiveType] = createSignal(searchParams.type || "all");
  const [query, setQuery] = createSignal(searchParams.q || "");
  const [sortBy, setSortBy] = createSignal(searchParams.sort || "newest");
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [selectedProduct, setSelectedProduct] = createSignal(null);
  const [favouriteIds, setFavouriteIds] = createSignal(new Set());
  const [pendingFavouriteIds, setPendingFavouriteIds] = createSignal(new Set());
  const [providerNames, setProviderNames] = createSignal(new Map());
  const [selectedProviderIds, setSelectedProviderIds] = createSignal(new Set(
    String(searchParams.providers || "").split(",").filter(Boolean),
  ));
  const [providerQuery, setProviderQuery] = createSignal(searchParams.provider || "");

  createEffect(() => {
    setActiveType(searchParams.type || "all");
    setQuery(searchParams.q || "");
    setSortBy(searchParams.sort || "newest");
    setSelectedProviderIds(new Set(String(searchParams.providers || "").split(",").filter(Boolean)));
    setProviderQuery(searchParams.provider || "");
  });

  function updateQuery(next) {
    setSearchParams(
      Object.fromEntries(
        Object.entries(next).map(([key, value]) => [key, value || undefined]),
      ),
      { replace: true },
    );
  }

  async function loadProducts() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "product_id, provider_id, name, description, price, type, capacity, quantity, rating, created_at, provider:providers!provider_id(provider_id, name)",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      const productsWithCovers = await Promise.all(
        (data ?? []).map(async (product) => ({
          ...product,
          providerName: product.provider?.name?.trim() || "Unnamed provider",
          coverUrl: await getProductCoverUrl(product.provider_id, product.product_id),
        })),
      );
      setProducts(productsWithCovers);
      setProviderNames(new Map(
        (productsWithCovers ?? [])
          .filter((product) => product.provider_id)
          .map((product) => [product.provider_id, product.providerName]),
      ));
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: favourites, error: favouritesError } = await supabase
          .from("favourites")
          .select("product_id")
          .eq("user_id", authData.user.id);
        if (favouritesError) throw favouritesError;
        setFavouriteIds(new Set((favourites ?? []).map(({ product_id }) => product_id)));
      } else {
        setFavouriteIds(new Set());
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load products right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  onMount(loadProducts);

  const types = () => [
    "all",
    ...new Set(
      products()
        .map((product) => product.type?.trim())
        .filter(Boolean),
    ),
  ];

  const providers = () => [
    ...new Map(
      [...providerNames().entries()]
        .map(([providerId, name]) => [providerId, name])
        .sort(([, firstName], [, secondName]) => firstName.localeCompare(secondName)),
    ).entries(),
  ];

  const visibleProviders = () => {
    const search = providerQuery().trim().toLowerCase();
    return providers()
      .filter(([providerId, providerName]) =>
        (!search || providerName.toLowerCase().includes(search))
        && (selectedProviderIds().has(providerId) || !search || providerName.toLowerCase().includes(search)),
      )
      .slice(0, 30);
  };

  function toggleProvider(providerId) {
    setSelectedProviderIds((current) => {
      const next = new Set(current);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      updateQuery({ providers: [...next].join(",") });
      return next;
    });
  }

  function setActiveTypeFromQuery(type) {
    setActiveType(type);
    updateQuery({ type: type === "all" ? "" : type });
  }

  function setQueryFromInput(value) {
    setQuery(value);
    updateQuery({ q: value });
  }

  function setSortFromQuery(sort) {
    setSortBy(sort);
    updateQuery({ sort: sort === "newest" ? "" : sort });
  }

  function setProviderQueryFromInput(value) {
    setProviderQuery(value);
    updateQuery({ provider: value });
  }

  const filteredProducts = () => {
    const search = query().trim().toLowerCase();

    return products()
      .filter((product) => {
        const matchesType =
          activeType() === "all" || product.type?.trim() === activeType();
        const matchesProvider =
          selectedProviderIds().size === 0 || selectedProviderIds().has(product.provider_id);
        const searchable = [
          product.name,
          product.description,
          product.type,
          product.capacity,
          product.providerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesType && matchesProvider && (!search || searchable.includes(search));
      })
      .sort((first, second) => {
        if (sortBy() === "price-low") return Number(first.price) - Number(second.price);
        if (sortBy() === "price-high") return Number(second.price) - Number(first.price);
        if (sortBy() === "rating") return Number(second.rating) - Number(first.rating);
        return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
      });
  };

  async function toggleFavourite(productId) {
    if (pendingFavouriteIds().has(productId)) return;
    setErrorMessage("");

    setPendingFavouriteIds((current) => new Set([...current, productId]));
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        window.location.assign("/login");
        return;
      }

      const isFavourite = favouriteIds().has(productId);
      if (isFavourite) {
        const { error } = await supabase
          .from("favourites")
          .delete()
          .eq("product_id", productId)
          .eq("user_id", authData.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favourites")
          .insert({ product_id: productId, user_id: authData.user.id });
        if (error) throw error;
      }
      setFavouriteIds((current) => {
        const next = new Set(current);
        if (isFavourite) next.delete(productId);
        else next.add(productId);
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your favourites.");
    } finally {
      setPendingFavouriteIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1320px]">
        <BrandBanner
          eyebrow="Find something lovely"
          title="Explore Bakimono."
          description="Browse the collection and discover something made for your next good moment."
        />

        <section
          aria-label="Search and filter products"
          class="rounded-3xl border border-dry-sage-700 bg-dry-sage-900 p-4 sm:p-5"
        >
          <label class="flex h-12 items-center gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4">
            <Search size={18} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search products"
              value={query()}
              onInput={(event) => setQueryFromInput(event.currentTarget.value)}
              placeholder="Search products, descriptions, or types"
              class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text"
            />
          </label>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <div class="flex min-w-0 flex-1 flex-wrap gap-2">
              <For each={types()}>
                {(type) => (
                  <button
                    type="button"
                    aria-pressed={activeType() === type}
                    onClick={() => setActiveTypeFromQuery(type)}
                    class={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      activeType() === type
                        ? "border-hunter-green-500 bg-hunter-green-500 text-white"
                        : "border-dry-sage-700 bg-dust-grey-900 text-dust-grey-200 hover:border-fern-500"
                    }`}
                  >
                    {type === "all" ? "Everything" : type}
                  </button>
                )}
              </For>
            </div>
            <label class="flex h-10 items-center gap-2 rounded-full border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs font-medium text-dust-grey-200">
              <span>Sort</span>
              <select
                aria-label="Sort products"
                value={sortBy()}
                onChange={(event) => setSortFromQuery(event.currentTarget.value)}
                class="max-w-32 bg-transparent text-sm outline-none"
              >
                <option value="newest">Newest</option>
                <option value="rating">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
          <Show when={providers().length > 0}>
            <fieldset class="mt-4">
              <legend class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">
                Providers
              </legend>
              <div class="flex flex-wrap gap-2">
                <input
                  type="search"
                  aria-label="Search provider names"
                  value={providerQuery()}
                  onInput={(event) => setProviderQueryFromInput(event.currentTarget.value)}
                  placeholder="Search providers"
                  class="h-10 w-full rounded-full border border-dust-grey-600 bg-dust-grey-900 px-4 text-xs text-dust-grey-100 outline-none placeholder:text-dust-grey-text sm:w-64"
                />
                <button
                  type="button"
                  aria-pressed={selectedProviderIds().size === 0}
                  onClick={() => {
                    setSelectedProviderIds(new Set());
                    updateQuery({ providers: "" });
                  }}
                  class={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                    selectedProviderIds().size === 0
                      ? "border-hunter-green-500 bg-hunter-green-500 text-white"
                      : "border-dry-sage-700 bg-dust-grey-900 text-dust-grey-200 hover:border-fern-500"
                  }`}
                >
                  All providers
                </button>
                <For each={visibleProviders()}>
                  {([providerId, providerName]) => (
                    <button
                      type="button"
                      aria-pressed={selectedProviderIds().has(providerId)}
                      onClick={() => toggleProvider(providerId)}
                      class={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                        selectedProviderIds().has(providerId)
                          ? "border-hunter-green-500 bg-hunter-green-500 text-white"
                          : "border-dry-sage-700 bg-dust-grey-900 text-dust-grey-200 hover:border-fern-500"
                      }`}
                    >
                      {providerName}
                    </button>
                  )}
                </For>
              </div>
            </fieldset>
          </Show>
        </section>

        <div class="mt-8 flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-text">
              The collection
            </p>
            <h2 class="mt-1 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-[30px]">
              Discover your next favorite
            </h2>
          </div>
          <Show when={!isLoading() && !errorMessage()}>
            <p class="shrink-0 text-sm text-dust-grey-text">
              {filteredProducts().length} {filteredProducts().length === 1 ? "item" : "items"}
            </p>
          </Show>
        </div>

        <Show when={isLoading()}>
          <LoadingState class="mt-5" label="Loading products…" />
        </Show>

        <Show when={!isLoading() && errorMessage()}>
          <div role="alert" class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
            <h3 class="font-serif text-xl text-dust-grey-100">Products aren’t available</h3>
            <p class="mt-2 text-sm text-dust-grey-text">{errorMessage()}</p>
            <button
              type="button"
              onClick={loadProducts}
              class="mt-4 rounded-full bg-hunter-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              Try again
            </button>
          </div>
        </Show>

        <Show when={!isLoading() && !errorMessage() && filteredProducts().length > 0}>
          <section
            aria-label="Products"
            class="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            <For each={filteredProducts()}>
              {(product) => (
                <article
                  role="button"
                  tabindex="0"
                  aria-label={`View ${product.name || "product"} details`}
                  onClick={() => setSelectedProduct(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedProduct(product);
                    }
                  }}
                  class="group cursor-pointer overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-dry-sage-500 hover:shadow-xl hover:shadow-dust-grey-100/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                >
                  <div class="relative aspect-[1.45] overflow-hidden bg-dry-sage-900">
                    <Show when={product.coverUrl} fallback={
                      <div class="flex size-full items-center justify-center bg-linear-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                        <PackageSearch size={38} strokeWidth={1.3} class="text-dry-sage-300" aria-hidden="true" />
                      </div>
                    }>
                      <img src={product.coverUrl} alt={product.name || ""} loading="lazy" class="size-full object-cover transition duration-500 group-hover:scale-105" width="800" height="600" />
                    </Show>
                    <Show when={product.type}>
                      <span class="absolute left-3 top-3 rounded-full bg-dry-sage-900/95 px-3 py-1.5 text-[11px] font-semibold capitalize text-hunter-green-500 shadow-sm">
                        {product.type}
                      </span>
                    </Show>
                    <Show when={Number(product.quantity) <= 0}>
                      <span class="absolute right-14 top-3 rounded-full bg-dust-grey-100/90 px-3 py-1.5 text-[11px] font-semibold text-dust-grey-900 shadow-sm">
                        Out of stock
                      </span>
                    </Show>
                    <button
                      type="button"
                      aria-label={favouriteIds().has(product.product_id) ? `Remove ${product.name || "product"} from favourites` : `Add ${product.name || "product"} to favourites`}
                      aria-pressed={favouriteIds().has(product.product_id)}
                      disabled={pendingFavouriteIds().has(product.product_id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void toggleFavourite(product.product_id);
                      }}
                      class={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full shadow-sm transition ${
                        favouriteIds().has(product.product_id)
                          ? "bg-hunter-green-500 text-white hover:bg-hunter-green-400"
                          : "bg-dust-grey-900/95 text-dust-grey-text hover:text-hunter-green-500"
                      } disabled:cursor-wait disabled:opacity-60`}
                    >
                      <Heart
                        size={18}
                        fill={favouriteIds().has(product.product_id) ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <div class="p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h3 class="truncate font-serif text-[19px] font-semibold tracking-[-0.02em] text-dust-grey-100">
                          {product.name || "Untitled product"}
                        </h3>
                        <Show when={product.capacity}>
                          <p class="mt-1 truncate text-xs text-dust-grey-text">{product.capacity}</p>
                        </Show>
                      </div>
                      <Show when={Number(product.rating) > 0}>
                        <span class="flex shrink-0 items-center gap-1 rounded-full bg-dry-sage-900 px-2 py-1 text-xs font-semibold text-dry-sage-200">
                          <Star
                            size={13}
                            fill="currentColor"
                            class="text-dry-sage-400"
                            aria-hidden="true"
                          />
                          {Number(product.rating).toFixed(1)}
                        </span>
                      </Show>
                    </div>
                    <p class="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-dust-grey-200">
                      {product.description || "A little more to discover. Check back for details."}
                    </p>
                    <div class="mt-4 flex items-center justify-between gap-3 border-t border-dust-grey-700 pt-3">
                      <span class="font-semibold text-hunter-green-500">{formatPrice(product.price)}</span>
                      <span class="text-xs font-medium text-dust-grey-text">
                        {Number(product.quantity) > 0
                          ? `${product.quantity} available`
                          : "Currently unavailable"}
                      </span>
                    </div>
                  </div>
                </article>
              )}
            </For>
          </section>
        </Show>

        <Show when={!isLoading() && !errorMessage() && filteredProducts().length === 0}>
          <div class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center">
            <Search size={25} class="mx-auto text-dust-grey-text" aria-hidden="true" />
            <h3 class="mt-3 font-serif text-xl text-dust-grey-100">No products found</h3>
            <p class="mt-1 text-sm text-dust-grey-text">
              Try another search or choose a different type.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveType("all");
                updateQuery({ q: "", type: "", providers: "", provider: "" });
              }}
              class="mt-4 text-sm font-semibold text-hunter-green-500 hover:underline"
            >
              Clear search and filters
            </button>
          </div>
        </Show>

        <Show when={selectedProduct()}>
          {(product) => (
            <div
              class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-60 bg-pine-teal-100/55 backdrop-blur-sm"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget) setSelectedProduct(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-dialog-title"
                class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
              >
                <div class="relative aspect-[1.55] max-h-[42vh] shrink-0 overflow-hidden bg-dry-sage-900">
                  <Show when={product().coverUrl} fallback={
                    <div class="flex size-full items-center justify-center bg-linear-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                      <PackageSearch size={48} strokeWidth={1.3} class="text-dry-sage-300" aria-hidden="true" />
                    </div>
                  }>
                    <img src={product().coverUrl} alt={product().name || ""} class="size-full object-cover" width="800" height="600" />
                  </Show>
                  <button
                    type="button"
                    aria-label="Close product details"
                    onClick={() => setSelectedProduct(null)}
                    class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-dust-grey-900/95 text-dust-grey-200 shadow-sm transition hover:bg-dust-grey-900"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={favouriteIds().has(product().product_id) ? "Remove from favourites" : "Add to favourites"}
                    aria-pressed={favouriteIds().has(product().product_id)}
                    disabled={pendingFavouriteIds().has(product().product_id)}
                    onClick={() => void toggleFavourite(product().product_id)}
                    class={`absolute left-4 top-4 flex size-10 items-center justify-center rounded-full shadow-sm transition ${
                      favouriteIds().has(product().product_id)
                        ? "bg-hunter-green-500 text-white hover:bg-hunter-green-400"
                        : "bg-dust-grey-900/95 text-dust-grey-200 hover:text-hunter-green-500"
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    <Heart
                      size={19}
                      fill={favouriteIds().has(product().product_id) ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                  <Show when={product().type}>
                    <span class="absolute bottom-4 left-4 rounded-full bg-dry-sage-900/95 px-3 py-1.5 text-xs font-semibold capitalize text-hunter-green-500">
                      {product().type}
                    </span>
                  </Show>
                </div>

                <div class="p-5 sm:p-8">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 id="product-dialog-title" class="font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-3xl">
                        {product().name || "Untitled product"}
                      </h2>
                      <Show when={product().capacity}>
                        <p class="mt-2 text-sm text-dust-grey-text">{product().capacity}</p>
                      </Show>
                    </div>
                    <div class="flex items-center gap-3">
                      <Show when={Number(product().rating) > 0}>
                        <span class="flex items-center gap-1 rounded-full bg-dry-sage-900 px-3 py-2 text-sm font-semibold text-dry-sage-200">
                          <Star size={15} fill="currentColor" class="text-dry-sage-400" aria-hidden="true" />
                          {Number(product().rating).toFixed(1)}
                        </span>
                      </Show>
                      <span class="text-lg font-semibold text-hunter-green-500">
                        {formatPrice(product().price)}
                      </span>
                    </div>
                  </div>

                  <p class="mt-5 whitespace-pre-line text-sm leading-6 text-dust-grey-200">
                    {product().description || "More details about this product are coming soon."}
                  </p>
                  <p class="mt-4 text-sm text-dust-grey-text">
                    {Number(product().quantity) > 0
                      ? `${product().quantity} available`
                      : "Currently unavailable"}
                  </p>
                  <A
                    href={`/checkout/${encodeURIComponent(product().product_id)}`}
                    aria-disabled={Number(product().quantity) <= 0}
                    onClick={(event) => {
                      if (Number(product().quantity) <= 0) event.preventDefault();
                    }}
                    class={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition ${
                      Number(product().quantity) > 0
                        ? "bg-hunter-green-500 hover:bg-hunter-green-400"
                        : "cursor-not-allowed bg-dust-grey-400"
                    }`}
                  >
                    Continue to checkout
                    <ArrowRight size={16} aria-hidden="true" />
                  </A>
                </div>
              </section>
            </div>
          )}
        </Show>
      </div>
    </main>
  );
}
