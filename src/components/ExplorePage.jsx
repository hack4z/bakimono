import { A } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { ArrowRight, PackageSearch, Search, Star, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import { supabase } from "~/utils/supabase";
import { getProductImageUrl } from "~/utils/product-images";

function formatPrice(price) {
  const amount = Number(price);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
    : "$0.00";
}

export default function ExplorePage() {
  const [products, setProducts] = createSignal([]);
  const [activeType, setActiveType] = createSignal("all");
  const [query, setQuery] = createSignal("");
  const [sortBy, setSortBy] = createSignal("newest");
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [selectedProduct, setSelectedProduct] = createSignal(null);

  async function loadProducts() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "product_id, name, description, price, type, cover_image, images, capacity, quantity, rating, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data ?? []);
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

  const filteredProducts = () => {
    const search = query().trim().toLowerCase();

    return products()
      .filter((product) => {
        const matchesType =
          activeType() === "all" || product.type?.trim() === activeType();
        const searchable = [
          product.name,
          product.description,
          product.type,
          product.capacity,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesType && (!search || searchable.includes(search));
      })
      .sort((first, second) => {
        if (sortBy() === "price-low") return Number(first.price) - Number(second.price);
        if (sortBy() === "price-high") return Number(second.price) - Number(first.price);
        if (sortBy() === "rating") return Number(second.rating) - Number(first.rating);
        return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
      });
  };

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
          class="rounded-[24px] border border-dry-sage-700 bg-dry-sage-900 p-4 sm:p-5"
        >
          <label class="flex h-12 items-center gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4">
            <Search size={18} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search products"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search products, descriptions, or types"
              class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-300"
            />
          </label>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <div class="flex min-w-0 flex-1 flex-wrap gap-2">
              <For each={types()}>
                {(type) => (
                  <button
                    type="button"
                    aria-pressed={activeType() === type}
                    onClick={() => setActiveType(type)}
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
                onChange={(event) => setSortBy(event.currentTarget.value)}
                class="max-w-32 bg-transparent text-sm outline-none"
              >
                <option value="newest">Newest</option>
                <option value="rating">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
        </section>

        <div class="mt-8 flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">
              The collection
            </p>
            <h2 class="mt-1 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-[30px]">
              Discover your next favorite
            </h2>
          </div>
          <Show when={!isLoading() && !errorMessage()}>
            <p class="shrink-0 text-sm text-dust-grey-300">
              {filteredProducts().length} {filteredProducts().length === 1 ? "item" : "items"}
            </p>
          </Show>
        </div>

        <Show when={isLoading()}>
          <div role="status" class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center text-sm text-dust-grey-300">
            Loading products…
          </div>
        </Show>

        <Show when={!isLoading() && errorMessage()}>
          <div role="alert" class="mt-5 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
            <h3 class="font-serif text-xl text-dust-grey-100">Products aren’t available</h3>
            <p class="mt-2 text-sm text-dust-grey-300">{errorMessage()}</p>
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
                  class="group cursor-pointer overflow-hidden rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-dry-sage-500 hover:shadow-xl hover:shadow-dust-grey-100/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                >
                  <div class="relative aspect-[1.45] overflow-hidden bg-dry-sage-900">
                    <Show
                      when={getProductImageUrl(product)}
                      fallback={
                        <div class="flex size-full items-center justify-center bg-gradient-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                          <PackageSearch
                            size={38}
                            strokeWidth={1.3}
                            class="text-dry-sage-300"
                            aria-hidden="true"
                          />
                        </div>
                      }
                    >
                      {(image) => (
                        <img
                          src={image()}
                          alt={product.name}
                          loading="lazy"
                          class="size-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      )}
                    </Show>
                    <Show when={product.type}>
                      <span class="absolute left-3 top-3 rounded-full bg-dry-sage-900/95 px-3 py-1.5 text-[11px] font-semibold capitalize text-hunter-green-500 shadow-sm">
                        {product.type}
                      </span>
                    </Show>
                    <Show when={Number(product.quantity) <= 0}>
                      <span class="absolute right-3 top-3 rounded-full bg-dust-grey-100/90 px-3 py-1.5 text-[11px] font-semibold text-dust-grey-900 shadow-sm">
                        Out of stock
                      </span>
                    </Show>
                  </div>
                  <div class="p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h3 class="truncate font-serif text-[19px] font-semibold tracking-[-0.02em] text-dust-grey-100">
                          {product.name || "Untitled product"}
                        </h3>
                        <Show when={product.capacity}>
                          <p class="mt-1 truncate text-xs text-dust-grey-300">{product.capacity}</p>
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
                      <span class="text-xs font-medium text-dust-grey-300">
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
            <Search size={25} class="mx-auto text-dust-grey-300" aria-hidden="true" />
            <h3 class="mt-3 font-serif text-xl text-dust-grey-100">No products found</h3>
            <p class="mt-1 text-sm text-dust-grey-300">
              Try another search or choose a different type.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveType("all");
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
              class="product-drawer-backdrop fixed inset-0 z-[60] bg-pine-teal-100/55 backdrop-blur-sm"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget) setSelectedProduct(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-dialog-title"
                class="product-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
              >
                <div class="relative aspect-[1.55] max-h-[42vh] shrink-0 overflow-hidden bg-dry-sage-900">
                  <Show
                    when={getProductImageUrl(product())}
                    fallback={
                      <div class="flex size-full items-center justify-center bg-gradient-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                        <PackageSearch size={48} strokeWidth={1.3} class="text-dry-sage-300" aria-hidden="true" />
                      </div>
                    }
                  >
                    {(image) => (
                      <img src={image()} alt={product().name} class="size-full object-cover" />
                    )}
                  </Show>
                  <button
                    type="button"
                    aria-label="Close product details"
                    onClick={() => setSelectedProduct(null)}
                    class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-dust-grey-900/95 text-dust-grey-200 shadow-sm transition hover:bg-dust-grey-900"
                  >
                    <X size={18} aria-hidden="true" />
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
                        <p class="mt-2 text-sm text-dust-grey-300">{product().capacity}</p>
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
                  <p class="mt-4 text-sm text-dust-grey-300">
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
