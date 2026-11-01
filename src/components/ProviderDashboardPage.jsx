import { useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { ArrowDownUp, Ban, Check, CreditCard, ListFilter, LoaderCircle, Pencil, Plus, RefreshCw, Search, Smartphone, UserCheck, UserRound, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import LoadingState from "~/components/LoadingState";
import { getCurrentProvider, getProviderRecords } from "~/utils/provider-data";
import { normalizeKenyanPhone } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

const statuses = ["pending", "success", "cancelled"];
const inputClass =
  "h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-900";

const emptyRecordForm = () => ({
  type: "order",
  product_id: "",
  client_id: "",
  quantity: "1",
  period: "1",
  arrival_time: "",
  calendar_date: "",
  status: "pending",
});

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDateString(date) === value;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = String(value).split(":");
  if (!hours || !minutes) return String(value);
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatKes(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Math.round(amount))
    : "—";
}

function statusBadgeClass(status) {
  if (status === "success" || status === "completed") return "bg-fern-900 text-fern-300";
  if (status === "cancelled") return "bg-dust-grey-800 text-dust-grey-100";
  if (status === "ongoing") return "bg-pine-teal-900 text-pine-teal-300";
  if (status === "pending") return "bg-dry-sage-900 text-dry-sage-200";
  return "bg-dry-sage-900 text-dry-sage-200";
}

export default function ProviderDashboardPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = createSignal([]);
  const [records, setRecords] = createSignal([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal("all");
  const [statusFilter, setStatusFilter] = createSignal("all");
  const [productFilter, setProductFilter] = createSignal("all");
  const [sortBy, setSortBy] = createSignal("newest");
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [actionError, setActionError] = createSignal("");
  const [updatingRecordId, setUpdatingRecordId] = createSignal("");
  const [completingRecordId, setCompletingRecordId] = createSignal("");
  const [recordDrawerOpen, setRecordDrawerOpen] = createSignal(false);
  const [editingRecord, setEditingRecord] = createSignal(null);
  const [recordForm, setRecordForm] = createSignal(emptyRecordForm());
  const [customerPhone, setCustomerPhone] = createSignal("");
  const [customerResults, setCustomerResults] = createSignal([]);
  const [selectedCustomer, setSelectedCustomer] = createSignal(null);
  const [customerLookupLoading, setCustomerLookupLoading] = createSignal(false);
  const [customerLookupError, setCustomerLookupError] = createSignal("");
  const [recordSaveLoading, setRecordSaveLoading] = createSignal(false);
  const [recordSaveError, setRecordSaveError] = createSignal("");
  const [createQueryHandled, setCreateQueryHandled] = createSignal(false);
  const [paymentRecord, setPaymentRecord] = createSignal(null);
  const [paymentPhone, setPaymentPhone] = createSignal("");
  const [paymentPhoneLoading, setPaymentPhoneLoading] = createSignal(false);
  const [paymentPhoneMessage, setPaymentPhoneMessage] = createSignal("");
  const [paymentSubmitting, setPaymentSubmitting] = createSignal(false);
  const [paymentError, setPaymentError] = createSignal("");
  const [paymentSuccess, setPaymentSuccess] = createSignal("");

  async function loadRecords() {
    setLoading(true);
    setErrorMessage("");
    setActionError("");
    try {
      const { providerId } = await getCurrentProvider();
      const result = await getProviderRecords(providerId);
      setProducts(result.products);
      setRecords(result.records);
      if (!createQueryHandled()) {
        const type = searchParams.create;
        if (type === "order" || type === "booking") {
          const date = isValidCalendarDate(searchParams.date) ? searchParams.date : localDateString();
          openCreateRecord(type, date);
        }
        setCreateQueryHandled(true);
      }
    } catch (error) {
      setProducts([]);
      setRecords([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load orders and bookings.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateRecord(type, calendarDate = localDateString()) {
    setEditingRecord(null);
    setRecordForm({
      ...emptyRecordForm(),
      type,
      product_id: products()[0]?.product_id ?? "",
      calendar_date: calendarDate,
    });
    setCustomerPhone("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCustomerLookupError("");
    setRecordSaveError("");
    setRecordDrawerOpen(true);
  }

  function openEditRecord(record) {
    setEditingRecord(record);
    setRecordForm({
      type: record.type,
      product_id: record.product_id,
      client_id: record.client_id,
      quantity: String(record.quantity ?? 1),
      period: String(record.period ?? 1),
      arrival_time: record.arrival_time?.slice(0, 5) ?? "",
      calendar_date: "",
      status: record.status ?? "pending",
    });
    setCustomerPhone("");
    setCustomerResults([]);
    setSelectedCustomer({
      user_id: record.client_id,
      name: "Existing customer",
      phone: "",
    });
    setCustomerLookupError("");
    setRecordSaveError("");
    setRecordDrawerOpen(true);
  }

  function closeRecordDrawer() {
    if (recordSaveLoading()) return;
    setRecordDrawerOpen(false);
  }

  async function searchCustomers() {
    if (customerLookupLoading()) return;
    const phone = normalizeKenyanPhone(customerPhone());
    if (!phone) {
      setCustomerLookupError("Enter a valid Kenyan phone number to search.");
      setCustomerResults([]);
      return;
    }

    setCustomerLookupLoading(true);
    setCustomerLookupError("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    try {
      const nationalNumber = phone.slice(3);
      const phoneVariants = [
        phone,
        `+${phone}`,
        `0${nationalNumber}`,
        nationalNumber,
      ];
      const formattedPhonePattern = `%${nationalNumber.split("").join("%")}%`;
      const [exactMatch, formattedMatch] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, phone")
          .in("phone", phoneVariants)
          .limit(20),
        supabase
          .from("profiles")
          .select("user_id, name, phone")
          .ilike("phone", formattedPhonePattern)
          .limit(20),
      ]);
      if (exactMatch.error) throw exactMatch.error;
      if (formattedMatch.error) throw formattedMatch.error;

      const matchingProfiles = new Map(
        [...(exactMatch.data ?? []), ...(formattedMatch.data ?? [])]
          .filter((profile) => normalizeKenyanPhone(profile.phone) === phone)
          .map((profile) => [profile.user_id, profile]),
      );
      const matches = [...matchingProfiles.values()];
      setCustomerResults(matches);
      if (!matches.length) {
        setCustomerLookupError("No customer profile matched that phone number. Check that the number is saved in profiles.phone.");
      }
    } catch (error) {
      setCustomerLookupError(error instanceof Error ? error.message : "Unable to search customer profiles.");
    } finally {
      setCustomerLookupLoading(false);
    }
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (recordSaveLoading()) return;
    setRecordSaveError("");

    const current = recordForm();
    const selectedProduct = products().find((product) => product.product_id === current.product_id);
    const clientId = selectedCustomer()?.user_id ?? current.client_id;
    const quantity = Number(current.quantity);
    const period = Number(current.period);
    if (!selectedProduct) {
      setRecordSaveError("Choose a product from this provider workspace.");
      return;
    }
    if (!clientId) {
      setRecordSaveError("Search by phone and select a customer first.");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setRecordSaveError("Quantity must be a whole number greater than zero.");
      return;
    }
    if (!Number.isSafeInteger(period) || period < 1) {
      setRecordSaveError("Period must be a whole number of hours greater than zero.");
      return;
    }
    if (!current.arrival_time) {
      setRecordSaveError("Choose an arrival time.");
      return;
    }
    if (!editingRecord() && !isValidCalendarDate(current.calendar_date)) {
      setRecordSaveError("Choose a valid calendar date.");
      return;
    }

    setRecordSaveLoading(true);
    try {
      const table = current.type === "booking" ? "bookings" : "orders";
      const values = {
        client_id: clientId,
        product_id: selectedProduct.product_id,
        quantity,
        period,
        arrival_time: current.arrival_time,
        status: current.status,
        updated_at: new Date().toISOString(),
      };
      let savedRecord;
      if (editingRecord()) {
        const { data, error } = await supabase
          .from(table)
          .update(values)
          .eq("entry_id", editingRecord().entry_id)
          .eq("product_id", editingRecord().product_id)
          .select("entry_id, created_at, updated_at, status, is_complete, client_id, product_id, period, quantity, arrival_time")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error(`The ${current.type} could not be updated.`);
        savedRecord = { ...data, type: current.type };
        setRecords((items) => items.map((record) =>
          record.type === current.type && record.entry_id === data.entry_id ? savedRecord : record,
        ));
      } else {
        const { data, error } = await supabase
          .from(table)
          .insert({ ...values, created_at: new Date(`${current.calendar_date}T12:00:00`).toISOString() })
          .select("entry_id, created_at, updated_at, status, is_complete, client_id, product_id, period, quantity, arrival_time")
          .single();
        if (error) throw error;
        savedRecord = { ...data, type: current.type };
        setRecords((items) => [savedRecord, ...items]);
      }
      setRecordDrawerOpen(false);
    } catch (error) {
      setRecordSaveError(error instanceof Error ? error.message : `Unable to save ${current.type}.`);
    } finally {
      setRecordSaveLoading(false);
    }
  }

  async function cancelRecord(record) {
    if (record.status === "cancelled" || updatingRecordId()) return;
    const recordKey = `${record.type}:${record.entry_id}`;
    setUpdatingRecordId(recordKey);
    setActionError("");
    try {
      const table = record.type === "booking" ? "bookings" : "orders";
      const { data, error } = await supabase
        .from(table)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("entry_id", record.entry_id)
        .eq("product_id", record.product_id)
        .select("entry_id, status")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`The ${record.type} status could not be updated.`);

      setRecords((current) => current.map((item) =>
        item.type === record.type && item.entry_id === record.entry_id
          ? { ...item, status: data.status }
          : item,
      ));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Unable to update ${record.type} status.`);
    } finally {
      setUpdatingRecordId("");
    }

    async function completeRecord(record) {
      if (record.is_complete || completingRecordId()) return;
      if (!window.confirm(`Mark this ${record.type} as complete?`)) return;
      const recordKey = `${record.type}:${record.entry_id}`;
      setCompletingRecordId(recordKey);
      setActionError("");
      try {
        const table = record.type === "booking" ? "bookings" : "orders";
        const { data, error } = await supabase
          .from(table)
          .update({ is_complete: true, updated_at: new Date().toISOString() })
          .eq("entry_id", record.entry_id)
          .eq("product_id", record.product_id)
          .select("entry_id, is_complete")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error(`The ${record.type} could not be completed.`);

        setRecords((current) => current.map((item) =>
          item.type === record.type && item.entry_id === record.entry_id
            ? { ...item, is_complete: data.is_complete }
            : item,
        ));
      } catch (error) {
        setActionError(error instanceof Error ? error.message : `Unable to complete ${record.type}.`);
      } finally {
        setCompletingRecordId("");
      }
    }
  }

  async function openPaymentDrawer(record) {
    if (paymentSubmitting() || paymentPhoneLoading() || paymentRecord()) return;
    setPaymentRecord(record);
    setPaymentPhone("");
    setPaymentPhoneMessage("");
    setPaymentError("");
    setPaymentSuccess("");
    setPaymentPhoneLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", record.client_id)
        .maybeSingle();
      if (error) throw error;
      setPaymentPhone(profile?.phone ?? "");
      if (!profile?.phone) setPaymentPhoneMessage("No phone number is saved for this customer. Enter one to continue.");
    } catch (error) {
      setPaymentPhoneMessage(
        error instanceof Error
          ? `Could not load the customer’s saved phone number: ${error.message}`
          : "Could not load the customer’s saved phone number. Enter one to continue.",
      );
    } finally {
      setPaymentPhoneLoading(false);
    }
  }

  function closePaymentDrawer() {
    if (paymentSubmitting() || paymentPhoneLoading()) return;
    setPaymentRecord(null);
    setPaymentError("");
  }

  async function initiateMpesaPayment(event) {
    event.preventDefault();
    const record = paymentRecord();
    if (!record || paymentSubmitting() || paymentSuccess()) return;

    const phone = normalizeKenyanPhone(paymentPhone());
    if (!phone) {
      setPaymentError("Enter a valid Kenyan mobile number.");
      return;
    }
    const quantity = Number(record.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setPaymentError("This record has an invalid quantity. Edit it before requesting payment.");
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError("");
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          product_id: record.product_id,
          phone,
          quantity,
          arrival_time: record.arrival_time,
        },
      });
      if (data?.error) throw new Error(data.error);
      const accepted = Boolean(
        data
        && (
          data.success === true
          || ["pending", "initiated", "awaiting_response"].includes(String(data.status).toLowerCase())
          || data.paymentId
          || data.payment_id
          || data.orderId
          || data.order_id
          || data.message
          || data.statusMessage
        ),
      );
      if (error && !accepted) throw error;
      if (!accepted) throw new Error("The M-PESA payment request could not be started.");
      setPaymentSuccess(`M-PESA payment request sent to ${phone}. Ask the customer to approve it on their phone.`);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Unable to initiate M-PESA payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  onMount(() => void loadRecords());
  const productById = createMemo(() => new Map(products().map((product) => [product.product_id, product])));
  const filteredRecords = createMemo(() => {
    const query = searchQuery().trim().toLowerCase();
    return records().filter((record) => {
      const product = productById().get(record.product_id);
      const matchesQuery = !query || [
        record.type,
        record.status,
        record.client_id,
        record.entry_id,
        product?.name,
        product?.type,
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesType = typeFilter() === "all" || record.type === typeFilter();
      const matchesStatus = statusFilter() === "all" || record.status === statusFilter();
      const matchesProduct = productFilter() === "all" || record.product_id === productFilter();
      const matchesRecord = !searchParams.recordId || record.entry_id === searchParams.recordId;
      const matchesDate = !searchParams.date || localDateString(new Date(record.created_at)) === searchParams.date;
      return matchesQuery && matchesType && matchesStatus && matchesProduct && matchesRecord && matchesDate;
    }).sort((first, second) => {
      if (sortBy() === "oldest") return new Date(first.created_at) - new Date(second.created_at);
      if (sortBy() === "product-asc" || sortBy() === "product-desc") {
        const order = (productById().get(first.product_id)?.name ?? "").localeCompare(
          productById().get(second.product_id)?.name ?? "",
        );
        return sortBy() === "product-asc" ? order : -order;
      }
      if (sortBy() === "status-asc") return first.status.localeCompare(second.status);
      return new Date(second.created_at) - new Date(first.created_at);
    });
  });

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Orders & bookings."
          description="Review real orders and bookings linked to products in your provider workspace."
        />
        <Show when={errorMessage()}>
          <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>
        <Show when={actionError()}>
          <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError()}</p>
        </Show>
        <section class="mt-6 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-dust-grey-700 px-4 py-4 sm:px-6">
            <div>
              <h2 class="font-serif text-xl">Orders and bookings</h2>
              <p class="mt-1 text-xs text-dust-grey-text">
                {loading() ? "Loading records…" : `Showing ${filteredRecords().length} of ${records().length} records`}
              </p>
              <Show when={searchParams.recordId || searchParams.date}>
                <p class="mt-1 text-xs font-medium text-hunter-green-500">
                  {searchParams.recordId ? "Showing the selected calendar record" : `Created on ${searchParams.date}`}
                </p>
              </Show>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" onClick={() => openCreateRecord("order")} disabled={products().length === 0 || loading()} class="inline-flex h-9 items-center gap-2 rounded-lg bg-hunter-green-500 px-3 text-xs font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus size={15} aria-hidden="true" /> Create order
              </button>
              <button type="button" onClick={() => openCreateRecord("booking")} disabled={products().length === 0 || loading()} class="inline-flex h-9 items-center gap-2 rounded-lg border border-pine-teal-400/40 bg-pine-teal-900 px-3 text-xs font-semibold text-pine-teal-300 transition hover:bg-pine-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus size={15} aria-hidden="true" /> Create booking
              </button>
              <button type="button" onClick={() => void loadRecords()} disabled={loading()} class="inline-flex h-9 items-center gap-2 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-hunter-green-500 hover:bg-dry-sage-900 disabled:opacity-60">
                <RefreshCw size={14} class={loading() ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>
          <div class="grid gap-3 border-b border-dust-grey-700 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(8rem,0.55fr))]">
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3">
              <Search size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input type="search" value={searchQuery()} onInput={(event) => setSearchQuery(event.currentTarget.value)} placeholder="Search product, client, or reference" class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text" />
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <ListFilter size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <span>Type</span>
              <select value={typeFilter()} onChange={(event) => setTypeFilter(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="all">All</option><option value="booking">Bookings</option><option value="order">Orders</option>
              </select>
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <span>Status</span>
              <select value={statusFilter()} onChange={(event) => setStatusFilter(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm capitalize text-dust-grey-100 outline-none">
                <option value="all">All</option><For each={statuses}>{(status) => <option value={status}>{status}</option>}</For>
              </select>
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <span>Product</span>
              <select value={productFilter()} onChange={(event) => setProductFilter(event.currentTarget.value)} class="min-w-0 flex-1 truncate bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="all">All</option><For each={products()}>{(product) => <option value={product.product_id}>{product.name}</option>}</For>
              </select>
            </label>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
              <ArrowDownUp size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <span>Sort</span>
              <select value={sortBy()} onChange={(event) => setSortBy(event.currentTarget.value)} class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="product-asc">Product A–Z</option><option value="product-desc">Product Z–A</option><option value="status-asc">Status</option>
              </select>
            </label>
          </div>
          <Show when={!loading()} fallback={<LoadingState label="Loading provider records…" />}>
            <Show when={filteredRecords().length > 0} fallback={<p class="px-6 py-10 text-center text-sm text-dust-grey-text">{records().length ? "No records match your search and filters." : "No orders or bookings are available for this provider."}</p>}>
              <div class="overflow-x-auto">
                <table class="w-full min-w-360 text-left text-sm">
                  <caption class="sr-only">Provider orders and bookings</caption>
                  <thead class="bg-dry-sage-900 text-xs uppercase tracking-wide text-dust-grey-text">
                    <tr><th scope="col" class="px-4 py-3 font-semibold sm:px-6">Created</th><th scope="col" class="px-4 py-3 font-semibold">Type</th><th scope="col" class="px-4 py-3 font-semibold">Product</th><th scope="col" class="px-4 py-3 font-semibold">Customer ID</th><th scope="col" class="px-4 py-3 font-semibold">Quantity</th><th scope="col" class="px-4 py-3 font-semibold">Period</th><th scope="col" class="px-4 py-3 font-semibold">Arrival</th><th scope="col" class="px-4 py-3 font-semibold">Status</th><th scope="col" class="px-4 py-3 font-semibold">Reference</th><th scope="col" class="px-4 py-3 text-right font-semibold">Actions</th></tr>
                  </thead>
                  <tbody class="divide-y divide-dust-grey-700">
                    <For each={filteredRecords()}>{(record) => (
                      <tr class="text-dust-grey-100">
                        <td class="whitespace-nowrap px-4 py-4 sm:px-6">{formatDate(record.created_at)}</td>
                        <td class="px-4 py-4 capitalize">{record.type}</td>
                        <td class="max-w-72 truncate px-4 py-4 font-medium" title={productById().get(record.product_id)?.name ?? record.product_id}>{productById().get(record.product_id)?.name || record.product_id}</td>
                        <td class="px-4 py-4 font-mono text-xs">{record.client_id}</td>
                        <td class="px-4 py-4 tabular-nums">{Number(record.quantity) || "—"}</td>
                        <td class="px-4 py-4 tabular-nums">{record.period ? `${record.period} hr` : "—"}</td>
                        <td class="whitespace-nowrap px-4 py-4">{formatTime(record.arrival_time)}</td>
                        <td class="px-4 py-4"><span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(record.status)}`}>{record.status}</span></td>
                        <td class="px-4 py-4 font-mono text-xs">{record.entry_id}</td>
                        <td class="px-4 py-4">
                          <div class="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openPaymentDrawer(record)}
                              disabled={record.status === "success" || record.status === "cancelled" || paymentPhoneLoading() || Boolean(paymentRecord())}

                              title="Initiate M-PESA payment"
                              class="inline-flex h-9 items-center gap-2 rounded-lg border border-fern-600 bg-fern-900/40 px-2.5 text-xs font-semibold text-fern-300 transition hover:bg-fern-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Smartphone size={15} aria-hidden="true" />
                              <span>Initiate payment</span>
                            </button>
                            <button type="button" onClick={() => void cancelRecord(record)} disabled={record.status === "cancelled" || Boolean(updatingRecordId())} title="Cancel" class="inline-flex size-9 items-center justify-center rounded-lg border border-dust-grey-600 text-dust-grey-200 transition hover:bg-dust-grey-800 hover:text-dust-grey-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dust-grey-300 disabled:cursor-not-allowed disabled:opacity-50">
                              <Show when={updatingRecordId() === `${record.type}:${record.entry_id}`} fallback={<Ban size={16} aria-hidden="true" />}>
                                <LoaderCircle size={16} class="animate-spin" aria-hidden="true" />
                              </Show>
                            </button>
                            <button
                              type="button"
                              onClick={() => void completeRecord(record)}
                              disabled={Boolean(record.is_complete) || Boolean(completingRecordId())}
                              title={record.is_complete ? "Completed" : "Mark complete"}
                              aria-label={record.is_complete ? "Completed" : "Mark complete"}
                              class="inline-flex size-9 items-center justify-center rounded-lg border border-fern-700 bg-fern-900/30 text-fern-300 transition hover:bg-fern-900 hover:text-fern-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern-500 disabled:cursor-not-allowed disabled:border-fern-500 disabled:bg-fern-800 disabled:text-fern-200 disabled:opacity-100"
                            >
                              <Show when={completingRecordId() === `${record.type}:${record.entry_id}`} fallback={<UserCheck size={16} aria-hidden="true" />}>
                                <LoaderCircle size={16} class="animate-spin" aria-hidden="true" />
                              </Show>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </section>
        <Show when={recordDrawerOpen()}>
          <div
            class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-65 bg-pine-teal-100/55 backdrop-blur-sm"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeRecordDrawer();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="record-drawer-title"
              class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">
                    Provider workspace
                  </p>
                  <h2 id="record-drawer-title" class="mt-1 font-serif text-2xl text-dust-grey-100">
                    {editingRecord() ? `Edit ${recordForm().type}` : `Create ${recordForm().type}`}
                  </h2>
                  <p class="mt-1 text-sm text-dust-grey-text">
                    Assign this record to a customer profile using their phone number.
                  </p>
                </div>
                <button
                  type="button"

                  onClick={closeRecordDrawer}
                  disabled={recordSaveLoading()}
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text transition hover:bg-dust-grey-800 disabled:opacity-50"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <form class="flex flex-1 flex-col" onSubmit={saveRecord}>
                <div class="flex-1 space-y-5 p-5 sm:p-7">
                  <Show when={recordSaveError()}>
                    <p role="alert" class="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                      {recordSaveError()}
                    </p>
                  </Show>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Record type
                    <select
                      class={`${inputClass} mt-1`}
                      value={recordForm().type}
                      disabled={Boolean(editingRecord()) || recordSaveLoading()}
                      onChange={(event) => setRecordForm((current) => ({ ...current, type: event.currentTarget.value }))}
                    >
                      <option value="order">Order</option>
                      <option value="booking">Booking</option>
                    </select>
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Product
                    <select
                      class={`${inputClass} mt-1`}
                      required
                      value={recordForm().product_id}
                      disabled={recordSaveLoading()}
                      onChange={(event) => setRecordForm((current) => ({ ...current, product_id: event.currentTarget.value }))}
                    >
                      <option value="" disabled>Select a provider product</option>
                      <For each={products()}>{(product) => (
                        <option value={product.product_id}>{product.name || "Untitled product"}</option>
                      )}</For>
                    </select>
                  </label>
                  <Show when={!editingRecord()}>
                    <label class="block text-sm font-medium text-dust-grey-200">
                      Calendar date
                      <input
                        class={`${inputClass} mt-1`}
                        type="date"
                        required
                        value={recordForm().calendar_date}
                        disabled={recordSaveLoading()}
                        onInput={(event) => setRecordForm((current) => ({ ...current, calendar_date: event.currentTarget.value }))}
                      />
                      <span class="mt-1 block text-xs text-dust-grey-text">This order or booking will appear on this day in your provider calendar.</span>
                    </label>
                  </Show>
                  <div class="rounded-2xl border border-dust-grey-600 bg-dust-grey-800/50 p-4">
                    <p class="text-sm font-semibold text-dust-grey-100">Customer</p>
                    <div class="mt-3 flex gap-2">
                      <label class="min-w-0 flex-1">
                        <span class="sr-only">Customer phone number</span>
                        <input
                          class={inputClass}
                          type="tel"
                          inputmode="tel"
                          placeholder={editingRecord() ? "Customer is fixed while editing" : "Phone number (e.g. 0712 345 678)"}
                          value={customerPhone()}
                          disabled={Boolean(editingRecord()) || customerLookupLoading() || recordSaveLoading()}
                          onInput={(event) => {
                            setCustomerPhone(event.currentTarget.value);
                            setSelectedCustomer(null);
                            setCustomerResults([]);
                            setCustomerLookupError("");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void searchCustomers();
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void searchCustomers()}
                        disabled={Boolean(editingRecord()) || customerLookupLoading() || recordSaveLoading()}
                        class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 disabled:opacity-50"
                      >
                        <Search size={15} aria-hidden="true" />
                        {customerLookupLoading() ? "Searching…" : "Find"}
                      </button>
                    </div>
                    <Show when={customerLookupError()}>
                      <p role={customerResults().length ? "status" : "alert"} class="mt-2 text-xs text-dust-grey-text">{customerLookupError()}</p>
                    </Show>
                    <Show when={customerResults().length > 0}>
                      <div class="mt-3 space-y-2">
                        <For each={customerResults()}>{(customer) => (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerLookupError("");
                            }}
                            class={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedCustomer()?.user_id === customer.user_id ? "border-hunter-green-500 bg-dry-sage-900" : "border-dust-grey-600 bg-dust-grey-900 hover:border-hunter-green-500/50"}`}
                          >
                            <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-pine-teal-900 text-pine-teal-300">
                              <UserRound size={16} aria-hidden="true" />
                            </span>
                            <span class="min-w-0">
                              <span class="block truncate text-sm font-semibold text-dust-grey-100">{customer.name || "Customer"}</span>
                              <span class="block truncate text-xs text-dust-grey-text">{customer.phone} · {customer.user_id}</span>
                            </span>
                          </button>
                        )}</For>
                      </div>
                    </Show>
                    <Show when={selectedCustomer()}>
                      <div class="mt-3 flex items-start gap-3 rounded-xl border border-hunter-green-500/40 bg-dry-sage-900 p-3">
                        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-white">
                          <Check size={16} aria-hidden="true" />
                        </span>
                        <span class="min-w-0">
                          <span class="block text-xs font-semibold uppercase tracking-wide text-hunter-green-500">User selected</span>
                          <span class="mt-1 block truncate text-sm font-semibold text-dust-grey-100">{selectedCustomer().name || "Customer"}</span>
                          <span class="mt-0.5 block break-all text-xs text-dust-grey-text">
                            {selectedCustomer().phone || selectedCustomer().user_id}
                          </span>
                          <Show when={editingRecord()}>
                            <span class="mt-1 block text-xs text-dust-grey-text">The customer cannot be changed while editing this record.</span>
                          </Show>
                        </span>
                      </div>
                    </Show>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="block text-sm font-medium text-dust-grey-200">
                      Quantity
                      <input
                        class={`${inputClass} mt-1`}
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={recordForm().quantity}
                        disabled={recordSaveLoading()}
                        onInput={(event) => setRecordForm((current) => ({ ...current, quantity: event.currentTarget.value }))}
                      />
                    </label>
                    <label class="block text-sm font-medium text-dust-grey-200">
                      Period (hours)
                      <input
                        class={`${inputClass} mt-1`}
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={recordForm().period}
                        disabled={recordSaveLoading()}
                        onInput={(event) => setRecordForm((current) => ({ ...current, period: event.currentTarget.value }))}
                      />
                    </label>
                    <label class="block text-sm font-medium text-dust-grey-200 sm:col-span-2">
                      Arrival time
                      <input
                        class={`${inputClass} mt-1`}
                        type="time"
                        required
                        value={recordForm().arrival_time}
                        disabled={recordSaveLoading()}
                        onInput={(event) => setRecordForm((current) => ({ ...current, arrival_time: event.currentTarget.value }))}
                      />
                    </label>
                  </div>
                </div>
                <div class="sticky bottom-0 flex justify-end gap-3 border-t border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-7">
                  <button
                    type="button"
                    onClick={closeRecordDrawer}
                    disabled={recordSaveLoading()}
                    class="h-11 rounded-xl border border-dust-grey-600 px-4 text-sm font-semibold text-dust-grey-200 transition hover:bg-dust-grey-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordSaveLoading() || products().length === 0}
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Show when={recordSaveLoading()} fallback={editingRecord() ? <Pencil size={15} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}>
                      <LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
                    </Show>
                    {recordSaveLoading() ? "Saving…" : editingRecord() ? "Save changes" : "Create record"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Show>
        <Show when={paymentRecord()}>
          {(record) => {
            const product = () => productById().get(record().product_id);
            const total = () => Number(product()?.price) * Number(record().quantity);
            return (
              <div
                class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-65 bg-pine-teal-100/55 backdrop-blur-sm"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !paymentPhoneLoading()) closePaymentDrawer();
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="payment-drawer-title"
                  class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
                >
                  <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">M-PESA payment</p>
                      <h2 id="payment-drawer-title" class="mt-1 font-serif text-2xl text-dust-grey-100">
                        Initiate {record().type} payment
                      </h2>
                      <p class="mt-1 text-sm text-dust-grey-text">
                        Send an M-PESA payment prompt to the customer for this {record().type}.
                      </p>
                    </div>
                    <button
                      type="button"

                      onClick={closePaymentDrawer}
                      disabled={paymentSubmitting() || paymentPhoneLoading()}
                      class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text transition hover:bg-dust-grey-800 disabled:opacity-50"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <form class="flex flex-1 flex-col" onSubmit={initiateMpesaPayment}>
                    <div class="flex-1 space-y-5 p-5 sm:p-7">
                      <div class="rounded-2xl border border-dust-grey-600 bg-dust-grey-800/60 p-4">
                        <div class="flex items-start justify-between gap-4">
                          <div class="min-w-0">
                            <p class="text-xs font-semibold uppercase tracking-wide text-dust-grey-text">Payment for</p>
                            <p class="mt-1 truncate font-semibold text-dust-grey-100">
                              {product()?.name || "Provider product"}
                            </p>
                            <p class="mt-1 text-xs capitalize text-dust-grey-text">
                              {record().type} · Quantity {record().quantity}
                            </p>
                          </div>
                          <p class="shrink-0 text-right text-sm font-semibold tabular-nums text-hunter-green-500">
                            {formatKes(total())}
                          </p>
                        </div>
                      </div>

                      <Show when={paymentError()}>
                        <p role="alert" class="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                          {paymentError()}
                        </p>
                      </Show>
                      <Show when={paymentSuccess()}>
                        <p role="status" class="rounded-xl border border-fern-500/30 bg-fern-900/50 px-4 py-3 text-sm text-fern-300">
                          {paymentSuccess()}
                        </p>
                      </Show>
                      <label class="block text-sm font-medium text-dust-grey-200">
                        Customer M-PESA phone number
                        <span class="relative mt-1 block">
                          <Smartphone size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hunter-green-500" aria-hidden="true" />
                          <input
                            class={`${inputClass} pl-10`}
                            type="tel"
                            inputmode="tel"
                            autocomplete="tel"
                            required
                            placeholder="0712 345 678"
                            value={paymentPhone()}
                            disabled={paymentPhoneLoading() || paymentSubmitting() || Boolean(paymentSuccess())}
                            onInput={(event) => {
                              setPaymentPhone(event.currentTarget.value);
                              setPaymentError("");
                            }}
                          />
                        </span>
                        <span class="mt-1 block text-xs text-dust-grey-text">
                          {paymentPhoneLoading()
                            ? "Loading the customer’s saved phone number…"
                            : paymentPhoneMessage() || "The saved profile number is prefilled. You can change it before sending."}
                        </span>
                      </label>
                      <div class="flex items-start gap-3 rounded-xl border border-pine-teal-500/20 bg-pine-teal-900/30 p-3 text-xs leading-5 text-pine-teal-300">
                        <CreditCard size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
                        <p>The existing M-PESA checkout service will send a payment request to this number. The customer must approve it on their phone.</p>
                      </div>
                    </div>
                    <div class="sticky bottom-0 flex justify-end gap-3 border-t border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-7">
                      <button
                        type="button"
                        onClick={closePaymentDrawer}
                        disabled={paymentSubmitting() || paymentPhoneLoading()}
                        class="h-11 rounded-xl border border-dust-grey-600 px-4 text-sm font-semibold text-dust-grey-200 transition hover:bg-dust-grey-800 disabled:opacity-50"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={paymentPhoneLoading() || paymentSubmitting() || Boolean(paymentSuccess())}
                        class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Show when={paymentSubmitting()} fallback={<Smartphone size={16} aria-hidden="true" />}>
                          <LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
                        </Show>
                        {paymentSubmitting() ? "Sending request…" : paymentSuccess() ? "Request sent" : "Send M-PESA request"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            );
          }}
        </Show>
      </div>
    </main>
  );
}
