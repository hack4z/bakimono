import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { AlertCircle, ArrowDownUp, Check, Copy, ReceiptText, RefreshCw, Search, X } from "lucide-solid";
import { getCurrentProvider, getProviderProducts } from "~/utils/provider-data";
import { supabase } from "~/utils/supabase-client";
import LoadingState from "~/components/LoadingState";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";

const statusClass = {
  success: "bg-fern-500/10 text-fern-text",
  paid: "bg-fern-500/10 text-fern-text",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

function formatTransactionDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatReceiptValue(value) {
  if (value == null || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}

export default function ProviderPaymentRecordsPage() {
  const [query, setQuery] = createSignal("");
  const [statusFilter, setStatusFilter] = createSignal("all");
  const [sortOrder, setSortOrder] = createSignal("newest");
  const [rows, setRows] = createSignal([]);
  const [productNames, setProductNames] = createSignal({});
  const [selectedReceipt, setSelectedReceipt] = createSignal(null);
  const [copiedValue, setCopiedValue] = createSignal("");
  const [copyError, setCopyError] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [profileWarning, setProfileWarning] = createSignal("");
  let loadRequest = 0;

  async function loadTransactions() {
    const requestId = ++loadRequest;
    setLoading(true);
    setErrorMessage("");
    setProfileWarning("");
    try {
      const { providerId } = await getCurrentProvider();
      const products = await getProviderProducts(providerId);
      const names = Object.fromEntries(products.map((product) => [product.product_id, product.name]));
      setProductNames(names);
      const productIds = products.map((product) => product.product_id);
      if (!productIds.length) {
        if (requestId !== loadRequest) return;
        setRows([]);
        return;
      }

      const transactions = [];
      for (let offset = 0; offset < productIds.length; offset += 100) {
        const ids = productIds.slice(offset, offset + 100);
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from("transactions")
            .select("entry_id, created_at, updated_at, product_id, status, receipt_number, user_id, checkout_id, merchant_id, receipt, amount, quantity")
            .in("product_id", ids)
            .order("created_at", { ascending: false })
            .range(from, from + 999);
          if (error) throw error;
          transactions.push(...(data ?? []));
          if ((data ?? []).length < 1000) break;
        }
      }

      const userIds = [...new Set(transactions.map((transaction) => transaction.user_id).filter(Boolean))];
      let namesByUser = {};
      let profileLookupFailed = false;
      for (let offset = 0; offset < userIds.length; offset += 100) {
        const ids = userIds.slice(offset, offset + 100);
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", ids);
        if (error) {
          setProfileWarning(`Purchaser names could not all be loaded: ${error.message}`);
          profileLookupFailed = true;
          break;
        }
        namesByUser = {
          ...namesByUser,
          ...Object.fromEntries((profiles ?? []).map((profile) => [
            profile.user_id,
            profile.name?.trim() || "Customer",
          ])),
        };
      }
      if (!profileLookupFailed && userIds.some((userId) => !namesByUser[userId])) {
        setProfileWarning("Some purchaser profiles are unavailable. Those rows use a fallback name.");
      }
      if (requestId !== loadRequest) return;
      setRows(transactions.map((transaction) => ({
        ...transaction,
        purchaser_name: namesByUser[transaction.user_id] ?? "Customer",
      })).sort((first, second) => new Date(second.created_at) - new Date(first.created_at)));
    } catch (error) {
      if (requestId !== loadRequest) return;
      setRows([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load payment records.");
    } finally {
      if (requestId === loadRequest) setLoading(false);
    }
  }

  onMount(() => void loadTransactions());

  async function copyIdentifier(value) {
    setCopyError("");
    setCopiedValue("");
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable in this browser.");
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Unable to copy this value.");
    }
  }

  const statuses = createMemo(() => [...new Set(rows().map((transaction) => transaction.status))].sort());
  const transactions = createMemo(() => {
    const search = query().trim().toLocaleLowerCase();
    return rows()
      .filter((transaction) => statusFilter() === "all" || transaction.status === statusFilter())
      .filter((transaction) => !search || [
        transaction.entry_id,
        transaction.updated_at,
        transaction.product_id,
        transaction.user_id,
        transaction.checkout_id,
        transaction.merchant_id,
        transaction.receipt,
        transaction.amount,
        transaction.quantity,
        transaction.purchaser_name,
        transaction.status,
        transaction.receipt_number,
        productNames()[transaction.product_id],
        formatTransactionDate(transaction.created_at),
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(search)))
      .sort((first, second) => {
        if (sortOrder() === "oldest") return new Date(first.created_at) - new Date(second.created_at);
        if (sortOrder() === "status") return first.status.localeCompare(second.status);
        return new Date(second.created_at) - new Date(first.created_at);
      });
  });

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-12 pt-7 text-dust-grey-100 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-300">
        <ProviderSignupBanner />
        <header class="relative overflow-hidden rounded-7 border border-hunter-green-400 bg-linear-to-br from-hunter-green-500 via-pine-teal-500 to-fern-500 p-5 text-white shadow-sm sm:p-7 lg:p-8">
          <div aria-hidden="true" class="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-white/15" />
          <div class="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Provider payments</p>
              <h1 class="mt-1 font-serif text-3xl tracking-[-0.04em] sm:text-[38px]">Payment records</h1>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-white/85">Review purchasers, products, amounts, statuses, and receipt references.</p>
            </div>
            <div class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/90">
              <ReceiptText size={15} aria-hidden="true" />
              <span>{transactions().length} {transactions().length === 1 ? "record" : "records"}</span>
            </div>
          </div>
        </header>

        <Show when={errorMessage()}>
          <div role="alert" class="mt-5 flex items-start gap-3 rounded-2xl border border-rose-400/40 bg-rose-50 px-4 py-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertCircle size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 break-words">{errorMessage()}</span>
            <button type="button" onClick={() => void loadTransactions()} class="shrink-0 font-semibold underline">Try again</button>
          </div>
        </Show>
        <Show when={profileWarning()}>
          <p role="status" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-dust-grey-200">{profileWarning()}</p>
        </Show>
        <Show when={copyError() && !selectedReceipt()}>
          <p role="alert" class="mt-4 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{copyError()}</p>
        </Show>

        <section class="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-dust-grey-600 bg-dry-sage-900 p-4">
          <label class="grid min-w-56 flex-1 gap-1 text-xs font-medium text-dust-grey-text">
            <span>Search records</span>
            <span class="flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 focus-within:border-hunter-green-500 focus-within:ring-2 focus-within:ring-hunter-green-500/15">
              <Search size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input type="search" value={query()} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="Purchaser, product, amount, receipt" class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-400" />
            </span>
          </label>
          <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
            <span>Status</span>
            <select value={statusFilter()} onChange={(event) => setStatusFilter(event.currentTarget.value)} class="h-10 min-w-36 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm capitalize text-dust-grey-100 outline-none focus:border-hunter-green-500">
              <option value="all">All statuses</option>
              <For each={statuses()}>{(status) => <option value={status}>{status}</option>}</For>
            </select>
          </label>
          <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
            <span>Sort by</span>
            <span class="flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3">
              <ArrowDownUp size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <select value={sortOrder()} onChange={(event) => setSortOrder(event.currentTarget.value)} class="min-w-36 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="status">Status</option>
              </select>
            </span>
          </label>
          <button type="button" onClick={() => void loadTransactions()} disabled={loading()} class="inline-flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-medium disabled:opacity-60">
            <RefreshCw size={15} class={loading() ? "animate-spin" : ""} aria-hidden="true" /> Refresh
          </button>
        </section>

        <section class="mt-5 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dry-sage-900">
          <Show when={loading()}>
            <LoadingState label="Loading payment records…" />
          </Show>
          <Show when={!loading() && transactions().length === 0 && !errorMessage()}>
            <p role="status" class="px-5 py-12 text-center text-sm text-dust-grey-text">No payment records match these filters.</p>
          </Show>
          <Show when={!loading() && transactions().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full min-w-450 text-left text-sm">
                <caption class="sr-only">All transaction fields and related purchaser and product information</caption>
                <thead class="bg-dust-grey-800 text-[11px] uppercase tracking-wide text-dust-grey-text">
                  <tr>
                    <th scope="col" class="px-5 py-3 font-semibold">Entry ID</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Created</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Updated</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Product ID</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Purchased by</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Product</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Amount</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Quantity</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Receipt number</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Checkout ID</th>
                    <th scope="col" class="px-5 py-3 font-semibold">Receipt data</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dust-grey-600">
                  <For each={transactions()}>{(transaction) => (
                    <tr class="transition hover:bg-dust-grey-800/60">
                      <td class="max-w-56 truncate px-5 py-4 font-mono text-xs text-dust-grey-text" title={transaction.entry_id}>{transaction.entry_id}</td>
                      <td class="whitespace-nowrap px-5 py-4 text-dust-grey-200">{formatTransactionDate(transaction.created_at)}</td>
                      <td class="whitespace-nowrap px-5 py-4 text-dust-grey-200">{formatTransactionDate(transaction.updated_at)}</td>
                      <td class="px-5 py-4">
                        <Show when={transaction.product_id} fallback={<span class="text-dust-grey-400">—</span>}>
                          <span class="inline-flex max-w-64 items-center gap-2">
                            <span class="truncate font-mono text-xs text-dust-grey-text" title={transaction.product_id}>{transaction.product_id}</span>
                            <button type="button" title={copiedValue() === transaction.product_id ? "Copied" : "Copy product ID"} onClick={() => void copyIdentifier(transaction.product_id)} class="shrink-0 rounded-md p-1 text-hunter-green-500 hover:bg-dust-grey-800 focus-visible:outline-2 focus-visible:outline-hunter-green-500">
                              <Show when={copiedValue() === transaction.product_id} fallback={<Copy size={14} aria-hidden="true" />}><Check size={14} aria-hidden="true" /></Show>
                            </button>
                          </span>
                        </Show>
                      </td>
                      <td class="px-5 py-4">
                        <span class="whitespace-nowrap font-medium text-dust-grey-100">{transaction.purchaser_name}</span>
                      </td>
                      <td class="max-w-72 truncate px-5 py-4 font-medium text-dust-grey-100" title={productNames()[transaction.product_id] ?? transaction.product_id}>{productNames()[transaction.product_id] ?? "Product unavailable"}</td>
                      <td class="whitespace-nowrap px-5 py-4 tabular-nums text-dust-grey-100">{transaction.amount}</td>
                      <td class="whitespace-nowrap px-5 py-4 text-dust-grey-200">{transaction.quantity ?? "—"}</td>
                      <td class="px-5 py-4"><span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass[transaction.status] ?? "bg-dust-grey-800 text-dust-grey-200"}`}>{transaction.status}</span></td>
                      <td class="whitespace-nowrap px-5 py-4 font-mono text-xs text-dust-grey-text">{transaction.receipt_number ?? "—"}</td>
                      <td class="px-5 py-4">
                        <Show when={transaction.checkout_id} fallback={<span class="text-dust-grey-400">—</span>}>
                          <span class="inline-flex max-w-64 items-center gap-2">
                            <span class="truncate font-mono text-xs text-dust-grey-text" title={transaction.checkout_id}>{transaction.checkout_id}</span>
                            <button type="button" title={copiedValue() === transaction.checkout_id ? "Copied" : "Copy checkout ID"} onClick={() => void copyIdentifier(transaction.checkout_id)} class="shrink-0 rounded-md p-1 text-hunter-green-500 hover:bg-dust-grey-800 focus-visible:outline-2 focus-visible:outline-hunter-green-500">
                              <Show when={copiedValue() === transaction.checkout_id} fallback={<Copy size={14} aria-hidden="true" />}><Check size={14} aria-hidden="true" /></Show>
                            </button>
                          </span>
                        </Show>
                      </td>
                      <td class="px-5 py-4">
                        <Show when={transaction.receipt != null} fallback={<span class="text-dust-grey-400">—</span>}>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(transaction)}
                            class="inline-flex items-center gap-2 rounded-lg border border-dust-grey-600 px-3 py-2 text-xs font-semibold text-hunter-green-500 transition hover:bg-dust-grey-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                          >
                            <ReceiptText size={14} aria-hidden="true" />
                            View receipt
                          </button>
                        </Show>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          </Show>
          <footer class="border-t border-dust-grey-600 px-5 py-3 text-xs text-dust-grey-400">
            Showing {transactions().length} {transactions().length === 1 ? "transaction" : "transactions"}
          </footer>
        </section>
      </div>
      <Show when={selectedReceipt()}>
        {(transaction) => (
          <div
            class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-65 bg-pine-teal-100/55 backdrop-blur-sm"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedReceipt(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-drawer-title"
              class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Transaction receipt</p>
                  <h2 id="receipt-drawer-title" class="mt-1 break-words font-serif text-2xl text-dust-grey-100">
                    {transaction().receipt_number || "Receipt details"}
                  </h2>
                  <p class="mt-1 text-sm text-dust-grey-text">
                    {transaction().purchaser_name} · {formatTransactionDate(transaction().created_at)}
                  </p>
                </div>
                <button
                  type="button"

                  onClick={() => setSelectedReceipt(null)}
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text transition hover:bg-dust-grey-800"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div class="flex-1 space-y-5 p-5 sm:p-7">
                <Show when={copyError()}>
                  <p role="alert" class="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{copyError()}</p>
                </Show>
                <div class="flex items-center justify-between gap-3 rounded-xl border border-dust-grey-600 bg-dry-sage-900 px-4 py-3">
                  <span class="text-sm text-dust-grey-text">Transaction status</span>
                  <span class={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass[transaction().status] ?? "bg-dust-grey-800 text-dust-grey-200"}`}>
                    {transaction().status}
                  </span>
                </div>
                <div class="rounded-xl border border-dust-grey-600 bg-dry-sage-900 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wide text-dust-grey-400">Merchant ID</p>
                  <Show when={transaction().merchant_id} fallback={<p class="mt-2 text-sm text-dust-grey-text">Not available</p>}>
                    <div class="mt-2 flex items-center justify-between gap-3">
                      <span class="min-w-0 break-all font-mono text-sm text-dust-grey-100">{transaction().merchant_id}</span>
                      <button
                        type="button"

                        title={copiedValue() === transaction().merchant_id ? "Copied" : "Copy merchant ID"}
                        onClick={() => void copyIdentifier(transaction().merchant_id)}
                        class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dust-grey-600 text-hunter-green-500 transition hover:bg-dust-grey-800 focus-visible:outline-2 focus-visible:outline-hunter-green-500"
                      >
                        <Show when={copiedValue() === transaction().merchant_id} fallback={<Copy size={15} aria-hidden="true" />}><Check size={15} aria-hidden="true" /></Show>
                      </button>
                    </div>
                  </Show>
                </div>
                <dl class="space-y-3">
                  <For each={Object.entries(
                    typeof transaction().receipt === "object" && !Array.isArray(transaction().receipt)
                      ? transaction().receipt
                      : { receipt: transaction().receipt },
                  )}>{([key, value]) => (
                    <div class="min-w-0 rounded-xl border border-dust-grey-600 bg-dry-sage-900 p-4">
                      <dt class="break-words text-xs font-semibold uppercase tracking-wide text-dust-grey-400">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd class="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-dust-grey-100">
                        {formatReceiptValue(value)}
                      </dd>
                    </div>
                  )}</For>
                </dl>
              </div>
            </section>
          </div>
        )}
      </Show>
    </main>
  );
}
