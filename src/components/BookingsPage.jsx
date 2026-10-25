import { A } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { CalendarDays, Check, Copy, Package, Search, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import { getProductImageUrl } from "~/utils/product-images";
import { supabase } from "~/utils/supabase";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function statusTone(status) {
  const value = status.toLowerCase();
  if (["confirmed", "complete", "completed", "fulfilled", "delivered"].includes(value)) {
    return "bg-fern-900 text-fern-300";
  }
  if (["cancelled", "canceled", "rejected", "failed"].includes(value)) {
    return "bg-rose-100 text-rose-700";
  }
  if (["pending", "processing", "in progress"].includes(value)) {
    return "bg-dry-sage-900 text-dry-sage-200";
  }
  return "bg-dust-grey-700 text-dust-grey-200";
}

export default function BookingsPage() {
  const [records, setRecords] = createSignal([]);
  const [user, setUser] = createSignal(null);
  const [recordType, setRecordType] = createSignal("all");
  const [status, setStatus] = createSignal("all");
  const [sortBy, setSortBy] = createSignal("newest");
  const [query, setQuery] = createSignal("");
  const [selectedRecord, setSelectedRecord] = createSignal(null);
  const [copiedReference, setCopiedReference] = createSignal("");
  const [copyError, setCopyError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");

  async function loadRecords() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const currentUser = userData.user;
      setUser(currentUser);
      if (!currentUser) {
        setRecords([]);
        return;
      }

      const [bookingsResult, ordersResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("entry_id, created_at, updated_at, status, client_id, product_id, period")
          .eq("client_id", currentUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("entry_id, created_at, updated_at, status, client_id, product_id, period")
          .eq("client_id", currentUser.id)
          .order("created_at", { ascending: false }),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const joinedRecords = [
        ...(bookingsResult.data ?? []).map((record) => ({ ...record, recordType: "booking" })),
        ...(ordersResult.data ?? []).map((record) => ({ ...record, recordType: "order" })),
      ];
      const productIds = [...new Set(joinedRecords.map((record) => record.product_id))];

      if (productIds.length) {
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("product_id, name, description, price, type, cover_image, images, capacity")
          .in("product_id", productIds);

        if (productsError) throw productsError;

        const productsById = new Map((products ?? []).map((product) => [product.product_id, product]));
        joinedRecords.forEach((record) => {
          record.product = productsById.get(record.product_id) ?? null;
        });
      }

      joinedRecords.sort(
        (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
      );
      setRecords(joinedRecords);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load your bookings and orders.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  onMount(loadRecords);

  const statuses = createMemo(() => [
    "all",
    ...new Set(records().map((record) => record.status?.trim()).filter(Boolean)),
  ]);

  const filteredRecords = createMemo(() => {
    const search = query().trim().toLowerCase();
    return records()
      .filter((record) => {
        const matchesType = recordType() === "all" || record.recordType === recordType();
        const matchesStatus = status() === "all" || record.status === status();
        const searchable = [
          record.product?.name,
          record.product?.description,
          record.product?.type,
          record.status,
          record.entry_id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesType && matchesStatus && (!search || searchable.includes(search));
      })
      .sort((first, second) => {
        if (sortBy() === "oldest") {
          return new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
        }
        if (sortBy() === "name-asc" || sortBy() === "name-desc") {
          const nameOrder = (first.product?.name ?? "").localeCompare(
            second.product?.name ?? "",
          );
          return sortBy() === "name-asc" ? nameOrder : -nameOrder;
        }
        return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
      });
  });

  async function copyReference(reference) {
    setCopyError("");
    setCopiedReference("");

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(reference);
      setCopiedReference(reference);
    } catch (error) {
      setCopyError(
        error instanceof Error ? error.message : "Unable to copy this reference.",
      );
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-[1120px]">
        <BrandBanner
          eyebrow="Your Bakimono plans"
          title="Bookings & orders."
          description="Keep track of your upcoming plans and orders in one place."
        />

        <Show when={user()}>
          <section
            aria-label="Filter bookings and orders"
            class="grid gap-3 rounded-[24px] border border-dry-sage-700 bg-dry-sage-900 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center sm:p-5"
          >
            <label class="flex h-11 items-center gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3">
              <Search size={17} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search bookings and orders"
                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search product or reference"
                class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-300"
              />
            </label>
            <label class="flex h-11 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-200">
              <span>Type</span>
              <select
                aria-label="Filter by type"
                value={recordType()}
                onChange={(event) => setRecordType(event.currentTarget.value)}
                class="bg-transparent text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="booking">Bookings</option>
                <option value="order">Orders</option>
              </select>
            </label>
            <label class="flex h-11 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-200">
              <span>Status</span>
              <select
                aria-label="Filter by status"
                value={status()}
                onChange={(event) => setStatus(event.currentTarget.value)}
                class="max-w-36 bg-transparent text-sm outline-none"
              >
                <For each={statuses()}>
                  {(value) => (
                    <option value={value}>
                      {value === "all"
                        ? "All statuses"
                        : value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <label class="flex h-11 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-200">
              <span>Sort</span>
              <select
                aria-label="Sort bookings and orders"
                value={sortBy()}
                onChange={(event) => setSortBy(event.currentTarget.value)}
                class="bg-transparent text-sm outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </label>
          </section>
        </Show>

        <Show when={isLoading()}>
          <div role="status" class="mt-6 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center text-sm text-dust-grey-300">
            Loading your bookings and orders…
          </div>
        </Show>

        <Show when={!isLoading() && !user() && !errorMessage()}>
          <div class="mt-6 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center">
            <h2 class="font-serif text-xl text-dust-grey-100">Sign in to see your plans</h2>
            <p class="mt-2 text-sm text-dust-grey-300">
              Your bookings and orders are linked to your Bakimono account.
            </p>
            <A
              href="/login"
              class="mt-4 inline-flex rounded-full bg-hunter-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              Log in
            </A>
          </div>
        </Show>

        <Show when={!isLoading() && errorMessage()}>
          <div role="alert" class="mt-6 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
            <h2 class="font-serif text-xl text-dust-grey-100">We couldn’t load your plans</h2>
            <p class="mt-2 text-sm text-dust-grey-300">{errorMessage()}</p>
            <button
              type="button"
              onClick={loadRecords}
              class="mt-4 rounded-full bg-hunter-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              Try again
            </button>
          </div>
        </Show>

        <Show when={!isLoading() && user() && !errorMessage()}>
          <div class="mt-7 flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">
                Your activity
              </p>
              <h2 class="mt-1 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100">
                {filteredRecords().length} {filteredRecords().length === 1 ? "result" : "results"}
              </h2>
            </div>
            <Show when={records().length > 0}>
              <p class="text-xs text-dust-grey-300">
                {records().length} total {records().length === 1 ? "record" : "records"}
              </p>
            </Show>
          </div>

          <Show when={filteredRecords().length > 0}>
            <section aria-label="Your bookings and orders" class="mt-4 grid gap-4">
              <For each={filteredRecords()}>
                {(record) => (
                  <article
                    role="button"
                    tabindex="0"
                    aria-label={`View ${record.recordType} details for ${record.product?.name || "product"}`}
                    onClick={() => {
                      setCopiedReference("");
                      setCopyError("");
                      setSelectedRecord(record);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setCopiedReference("");
                        setCopyError("");
                        setSelectedRecord(record);
                      }
                    }}
                    class="grid cursor-pointer overflow-hidden rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 text-left shadow-sm transition hover:border-dry-sage-500 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 sm:grid-cols-[180px_minmax(0,1fr)]"
                  >
                    <div class="relative min-h-40 bg-dry-sage-900 sm:min-h-[180px]">
                      <Show
                        when={record.product && getProductImageUrl(record.product)}
                        fallback={
                          <div class="flex size-full min-h-40 items-center justify-center bg-gradient-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                            {record.recordType === "booking" ? (
                              <CalendarDays size={32} strokeWidth={1.4} class="text-dry-sage-300" aria-hidden="true" />
                            ) : (
                              <Package size={32} strokeWidth={1.4} class="text-dry-sage-300" aria-hidden="true" />
                            )}
                          </div>
                        }
                      >
                        {(image) => (
                          <img
                            src={image()}
                            alt={record.product?.name ?? ""}
                            class="absolute inset-0 size-full object-cover"
                          />
                        )}
                      </Show>
                    </div>
                    <div class="flex flex-col justify-between gap-5 p-4 sm:p-5">
                      <div>
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-fern-500">
                              {record.recordType}
                            </p>
                            <h3 class="mt-1 font-serif text-xl text-dust-grey-100">
                              {record.product?.name || "Product details unavailable"}
                            </h3>
                          </div>
                          <span class={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusTone(record.status ?? "")}`}>
                            {record.status || "Unknown"}
                          </span>
                        </div>
                        <Show when={record.product?.type || record.product?.capacity}>
                          <p class="mt-1 text-sm text-dust-grey-300">
                            {[record.product?.type, record.product?.capacity].filter(Boolean).join(" · ")}
                          </p>
                        </Show>
                      </div>
                      <div class="flex flex-wrap items-end justify-between gap-3 border-t border-dust-grey-700 pt-3">
                        <div>
                          <p class="text-xs text-dust-grey-300">
                            Created {formatDate(record.created_at)}
                          </p>
                          <p class="mt-1 text-[11px] text-dust-grey-400">
                            Ref. {record.entry_id}
                          </p>
                        </div>
                        <Show when={record.product?.price != null}>
                          <p class="font-semibold text-hunter-green-500">
                            {new Intl.NumberFormat(undefined, {
                              style: "currency",
                              currency: "USD",
                            }).format(Number(record.product.price))}
                          </p>
                        </Show>
                      </div>
                    </div>
                  </article>
                )}
              </For>
            </section>
          </Show>

          <Show when={selectedRecord()}>
            {(record) => (
              <div
                class="product-drawer-backdrop fixed inset-0 z-[60] bg-pine-teal-100/55 backdrop-blur-sm"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setSelectedRecord(null);
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="booking-detail-title"
                  class="product-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
                >
                  <div class="relative aspect-[1.55] max-h-[42vh] shrink-0 overflow-hidden bg-dry-sage-900">
                    <Show
                      when={record().product && getProductImageUrl(record().product)}
                      fallback={
                        <div class="flex size-full items-center justify-center bg-gradient-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                          {record().recordType === "booking" ? (
                            <CalendarDays size={42} strokeWidth={1.4} class="text-dry-sage-300" aria-hidden="true" />
                          ) : (
                            <Package size={42} strokeWidth={1.4} class="text-dry-sage-300" aria-hidden="true" />
                          )}
                        </div>
                      }
                    >
                      {(image) => (
                        <img
                          src={image()}
                          alt={record().product?.name ?? ""}
                          class="size-full object-cover"
                        />
                      )}
                    </Show>
                    <button
                      type="button"
                      aria-label="Close booking details"
                      onClick={() => setSelectedRecord(null)}
                      class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-dust-grey-900/95 text-dust-grey-200 shadow-sm transition hover:bg-dust-grey-900"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <div class="p-5 sm:p-8">
                    <div class="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">
                          {record().recordType}
                        </p>
                        <h2 id="booking-detail-title" class="mt-2 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100 sm:text-3xl">
                          {record().product?.name || "Product details unavailable"}
                        </h2>
                        <Show when={record().product?.type || record().product?.capacity}>
                          <p class="mt-2 text-sm capitalize text-dust-grey-300">
                            {[record().product?.type, record().product?.capacity].filter(Boolean).join(" · ")}
                          </p>
                        </Show>
                      </div>
                      <span class={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusTone(record().status ?? "")}`}>
                        {record().status || "Unknown"}
                      </span>
                    </div>

                    <Show when={record().product?.description}>
                      <p class="mt-5 whitespace-pre-line text-sm leading-6 text-dust-grey-200">
                        {record().product.description}
                      </p>
                    </Show>

                    <dl class="mt-6 divide-y divide-dust-grey-700 rounded-2xl border border-dust-grey-600 px-4">
                      <div class="flex items-start justify-between gap-4 py-3">
                        <dt class="text-sm text-dust-grey-300">Reference</dt>
                        <dd class="flex max-w-[75%] items-start gap-2 text-right text-sm font-medium text-dust-grey-100">
                          <span class="break-all">{record().entry_id}</span>
                          <button
                            type="button"
                            aria-label={copiedReference() === record().entry_id ? "Reference copied" : "Copy reference"}
                            title={copiedReference() === record().entry_id ? "Copied" : "Copy reference"}
                            onClick={() => copyReference(record().entry_id)}
                            class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dust-grey-600 px-2 py-1 text-xs font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                          >
                            {copiedReference() === record().entry_id ? (
                              <>
                                <Check size={13} aria-hidden="true" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={13} aria-hidden="true" />
                                Copy
                              </>
                            )}
                          </button>
                        </dd>
                      </div>
                      <Show when={copyError()}>
                        <p role="alert" class="py-2 text-right text-xs text-rose-700">
                          {copyError()}
                        </p>
                      </Show>
                      <div class="flex items-start justify-between gap-4 py-3">
                        <dt class="text-sm text-dust-grey-300">Created</dt>
                        <dd class="text-right text-sm font-medium text-dust-grey-100">
                          {formatDate(record().created_at)}
                        </dd>
                      </div>
                      <div class="flex items-start justify-between gap-4 py-3">
                        <dt class="text-sm text-dust-grey-300">Last updated</dt>
                        <dd class="text-right text-sm font-medium text-dust-grey-100">
                          {formatDate(record().updated_at)}
                        </dd>
                      </div>
                      <div class="flex items-start justify-between gap-4 py-3">
                        <dt class="text-sm text-dust-grey-300">Duration</dt>
                        <dd class="text-right text-sm font-medium text-dust-grey-100">
                          {record().period} {Number(record().period) === 1 ? "hour" : "hours"}
                        </dd>
                      </div>
                      <Show when={record().product?.price != null}>
                        <div class="flex items-start justify-between gap-4 py-3">
                          <dt class="text-sm text-dust-grey-300">Product price</dt>
                          <dd class="text-right text-sm font-semibold text-hunter-green-500">
                            {new Intl.NumberFormat(undefined, {
                              style: "currency",
                              currency: "USD",
                            }).format(Number(record().product.price))}
                          </dd>
                        </div>
                      </Show>
                    </dl>
                  </div>
                </section>
              </div>
            )}
          </Show>

          <Show when={filteredRecords().length === 0}>
            <div class="mt-4 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center">
              <CalendarDays size={26} class="mx-auto text-dust-grey-300" aria-hidden="true" />
              <h3 class="mt-3 font-serif text-xl text-dust-grey-100">
                {records().length ? "No matching plans" : "Nothing booked just yet"}
              </h3>
              <p class="mt-1 text-sm text-dust-grey-300">
                {records().length
                  ? "Try changing your filters or search."
                  : "When you make a booking or place an order, it will show up here."}
              </p>
              <Show when={!records().length}>
                <A href="/explore" class="mt-4 inline-block text-sm font-semibold text-hunter-green-500 hover:underline">
                  Explore products
                </A>
              </Show>
              <Show when={records().length > 0}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setRecordType("all");
                    setStatus("all");
                    setSortBy("newest");
                  }}
                  class="mt-4 text-sm font-semibold text-hunter-green-500 hover:underline"
                >
                  Clear filters
                </button>
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </main>
  );
}
