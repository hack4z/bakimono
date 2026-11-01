import { A } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  X,
} from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import LoadingState from "~/components/LoadingState";
import { getCurrentProvider, getProviderRecords } from "~/utils/provider-data";
import { normalizeKenyanPhone, supabase } from "~/utils/supabase";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const statuses = ["checkout", "pending", "ongoing", "success", "completed", "cancelled"];
const inputClass =
  "h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-900";

function dayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventStart(record) {
  const parsed = new Date(record.created_at);
  return Number.isNaN(parsed.getTime()) ? null : dayStart(parsed);
}

function eventIncludesDate(record, date) {
  const start = eventStart(record);
  return Boolean(start && dateKey(start) === dateKey(date));
}

function formatMonth(date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatTime(value) {
  const [hours, minutes] = String(value).split(":");
  if (!hours || !minutes) return String(value);
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function statusClass(status) {
  if (status === "success" || status === "completed") return "bg-fern-900 text-fern-300";
  if (status === "cancelled") return "bg-dust-grey-800 text-dust-grey-100";
  if (status === "ongoing") return "bg-pine-teal-900 text-pine-teal-300";
  if (status === "pending") return "bg-dry-sage-900 text-dry-sage-200";
  return "bg-dry-sage-900 text-dry-sage-200";
}

function eventClass(record) {
  if (record.status === "cancelled") return "border-dust-grey-600 bg-dust-grey-800 text-dust-grey-100";
  return record.type === "booking"
    ? "border-pine-teal-400/40 bg-pine-teal-900 text-pine-teal-300"
    : "border-hunter-green-500/30 bg-dry-sage-900 text-hunter-green-500";
}

function createMonthDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export default function ProviderCalendarPage() {
  const today = dayStart(new Date());
  const [month, setMonth] = createSignal(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = createSignal(today);
  const [selectedRecordId, setSelectedRecordId] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal("all");
  const [statusFilter, setStatusFilter] = createSignal("all");
  const [inventory, setInventory] = createSignal([]);
  const [allRecords, setAllRecords] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [recordDrawerOpen, setRecordDrawerOpen] = createSignal(false);
  const [recordForm, setRecordForm] = createSignal({
    type: "order",
    product_id: "",
    quantity: "1",
    period: "1",
    arrival_time: "",
  });
  const [customerPhone, setCustomerPhone] = createSignal("");
  const [customerResults, setCustomerResults] = createSignal([]);
  const [selectedCustomer, setSelectedCustomer] = createSignal(null);
  const [customerLookupLoading, setCustomerLookupLoading] = createSignal(false);
  const [customerLookupError, setCustomerLookupError] = createSignal("");
  const [recordSaveLoading, setRecordSaveLoading] = createSignal(false);
  const [recordSaveError, setRecordSaveError] = createSignal("");
  const [recordSuccess, setRecordSuccess] = createSignal("");
  const [providerId, setProviderId] = createSignal("");

  async function loadCalendar() {
    setLoading(true);
    setErrorMessage("");
    try {
      const { providerId } = await getCurrentProvider();
      setProviderId(providerId);
      const result = await getProviderRecords(providerId);
      setInventory(result.products);
      setAllRecords(result.records);
    } catch (error) {
      setInventory([]);
      setAllRecords([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider calendar.");
    } finally {
      setLoading(false);
    }
  }

  onMount(() => void loadCalendar());

  const monthDays = createMemo(() => createMonthDays(month()));
  const records = createMemo(() => allRecords().filter((record) =>
    (typeFilter() === "all" || record.type === typeFilter())
    && (statusFilter() === "all" || record.status === statusFilter()),
  ));
  const monthRecords = createMemo(() => records().filter((record) => {
    const start = eventStart(record);
    if (!start) return false;
    const monthStart = new Date(month().getFullYear(), month().getMonth(), 1);
    const monthEnd = new Date(month().getFullYear(), month().getMonth() + 1, 0);
    return start >= monthStart && start <= monthEnd;
  }));
  const selectedEvents = createMemo(() =>
    records().filter((record) => eventIncludesDate(record, selectedDate())),
  );
  const selectedRecord = createMemo(() =>
    selectedEvents().find((record) => record.entry_id === selectedRecordId()),
  );
  const productById = createMemo(() => new Map(inventory().map((product) => [product.product_id, product])));

  function recordsForDate(date) {
    return records().filter((record) => eventIncludesDate(record, date));
  }

  function changeMonth(amount) {
    const nextMonth = new Date(month().getFullYear(), month().getMonth() + amount, 1);
    setMonth(nextMonth);
    setSelectedDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1));
    setSelectedRecordId("");
  }

  function goToToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    setSelectedRecordId("");
  }

  function selectDate(date) {
    setSelectedDate(dayStart(date));
    setSelectedRecordId("");
    setRecordSuccess("");
  }

  function openCreateRecord(type) {
    setRecordForm({
      type,
      product_id: inventory()[0]?.product_id ?? "",
      quantity: "1",
      period: "1",
      arrival_time: "",
    });
    setCustomerPhone("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCustomerLookupError("");
    setRecordSaveError("");
    setRecordSuccess("");
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
      const [exactMatch, formattedMatch] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, phone")
          .in("phone", [phone, `+${phone}`, `0${nationalNumber}`, nationalNumber])
          .limit(20),
        supabase
          .from("profiles")
          .select("user_id, name, phone")
          .ilike("phone", `%${nationalNumber.split("").join("%")}%`)
          .limit(20),
      ]);
      if (exactMatch.error) throw exactMatch.error;
      if (formattedMatch.error) throw formattedMatch.error;

      const matches = new Map(
        [...(exactMatch.data ?? []), ...(formattedMatch.data ?? [])]
          .filter((profile) => normalizeKenyanPhone(profile.phone) === phone)
          .map((profile) => [profile.user_id, profile]),
      );
      setCustomerResults([...matches.values()]);
      if (!matches.size) setCustomerLookupError("No customer profile matched that phone number.");
    } catch (error) {
      setCustomerLookupError(error instanceof Error ? error.message : "Unable to search customer profiles.");
    } finally {
      setCustomerLookupLoading(false);
    }
  }

  async function saveCalendarRecord(event) {
    event.preventDefault();
    if (recordSaveLoading()) return;
    setRecordSaveError("");

    const current = recordForm();
    const clientId = selectedCustomer()?.user_id;
    const quantity = Number(current.quantity);
    const period = Number(current.period);
    if (!providerId()) {
      setRecordSaveError("Provider workspace is not available. Refresh and try again.");
      return;
    }
    if (!inventory().some((product) => product.product_id === current.product_id)) {
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

    setRecordSaveLoading(true);
    try {
      const table = current.type === "booking" ? "bookings" : "orders";
      const { data, error } = await supabase
        .from(table)
        .insert({
          client_id: clientId,
          product_id: current.product_id,
          quantity,
          period,
          arrival_time: current.arrival_time,
          status: "pending",
          created_at: new Date(`${dateKey(selectedDate())}T12:00:00`).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("entry_id, created_at, updated_at, status, client_id, product_id, period, quantity, arrival_time")
        .single();
      if (error) throw error;

      setAllRecords((items) => [{ ...data, type: current.type }, ...items]);
      setSelectedRecordId("");
      setRecordDrawerOpen(false);
      setRecordSuccess(`${current.type === "booking" ? "Booking" : "Order"} added to ${formatFullDate(selectedDate())}.`);
    } catch (error) {
      setRecordSaveError(error instanceof Error ? error.message : `Unable to create ${current.type}.`);
    } finally {
      setRecordSaveLoading(false);
    }
  }

  function clearFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setSelectedRecordId("");
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Calendar."
          description="Review order and booking creation dates in one interactive calendar."
        />

        <Show when={errorMessage()}>
          <div role="alert" class="mt-5 flex items-start gap-3 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertCircle size={17} class="mt-0.5 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 break-words">{errorMessage()}</span>
            <button type="button" onClick={() => void loadCalendar()} class="shrink-0 font-semibold underline">Try again</button>
          </div>
        </Show>
        <Show when={loading()}>
          <LoadingState class="mt-5" label="Loading provider calendar…" />
        </Show>

        <section class="mt-6 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 sm:p-5">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="min-w-52 font-serif text-2xl">{formatMonth(month())}</h2>
              <div class="flex items-center gap-2">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" class="flex size-10 items-center justify-center rounded-xl border border-dust-grey-600 text-dust-grey-100 transition hover:bg-dry-sage-900">
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={goToToday} class="inline-flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-medium text-dust-grey-100 transition hover:bg-dry-sage-900">
                  <RotateCcw size={15} aria-hidden="true" /> Today
                </button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" class="flex size-10 items-center justify-center rounded-xl border border-dust-grey-600 text-dust-grey-100 transition hover:bg-dry-sage-900">
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
                <span>Type</span>
                <select aria-label="Filter calendar by type" value={typeFilter()} onChange={(event) => { setTypeFilter(event.currentTarget.value); setSelectedRecordId(""); }} class="bg-transparent text-sm text-dust-grey-100 outline-none">
                  <option value="all">All activity</option>
                  <option value="booking">Bookings</option>
                  <option value="order">Orders</option>
                </select>
              </label>
              <label class="flex h-10 items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 text-xs text-dust-grey-text">
                <span>Status</span>
                <select aria-label="Filter calendar by status" value={statusFilter()} onChange={(event) => { setStatusFilter(event.currentTarget.value); setSelectedRecordId(""); }} class="bg-transparent text-sm capitalize text-dust-grey-100 outline-none">
                  <option value="all">All statuses</option>
                  <For each={statuses}>{(status) => <option value={status}>{status}</option>}</For>
                </select>
              </label>
              <button type="button" onClick={clearFilters} class="h-10 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900">Clear filters</button>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-7 border-b border-dust-grey-700 pb-2 text-center text-xs font-semibold uppercase tracking-wide text-dust-grey-text">
            <For each={weekdays}>{(weekday) => <div class="py-2">{weekday}</div>}</For>
          </div>
          <div class="grid grid-cols-7 overflow-hidden rounded-b-xl border-l border-dust-grey-700">
            <For each={monthDays()}>
              {(date) => {
                const inMonth = date.getMonth() === month().getMonth();
                const selected = () => dateKey(date) === dateKey(selectedDate());
                const isToday = dateKey(date) === dateKey(today);
                const dayRecords = () => recordsForDate(date);
                return (
                  <div class={`relative min-h-[6.5rem] border-b border-r border-dust-grey-700 ${inMonth ? "bg-dust-grey-900" : "bg-dust-grey-800/70"}`}>
                    <button
                      type="button"
                      onClick={() => selectDate(date)}
                      aria-label={`${formatFullDate(date)}${dayRecords().length ? `, ${dayRecords().length} order or booking events` : ""}`}
                      aria-pressed={selected()}
                      title={`Select ${formatFullDate(date)}`}
                      class={`absolute inset-0 z-0 flex min-h-full w-full flex-col items-stretch p-1 text-left transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-hunter-green-500 sm:p-2 ${selected() ? "bg-hunter-green-500/15 ring-4 ring-inset ring-hunter-green-500" : ""}`}
                    >
                      <span class={`flex size-7 shrink-0 items-center justify-center self-start rounded-full text-xs font-bold sm:size-8 ${selected() ? "bg-hunter-green-500 text-white shadow-sm ring-2 ring-white" : isToday ? "border-2 border-hunter-green-500 text-hunter-green-500" : inMonth ? "text-dust-grey-100" : "text-dust-grey-400"}`}>
                        {date.getDate()}
                      </span>
                      <Show when={selected()}>
                        <span class="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-hunter-green-500 text-white sm:hidden">
                          <Check size={12} aria-hidden="true" />
                        </span>
                        <span class="absolute right-2 top-2 hidden rounded-full bg-hunter-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:block">
                          Selected
                        </span>
                      </Show>
                    </button>
                    <div class="pointer-events-none relative z-10 mt-9 grid gap-1 px-1 pb-1 sm:px-2">
                      <For each={dayRecords().slice(0, 2)}>
                        {(record) => {
                          const product = productById().get(record.product_id);
                          const productName = product?.name ?? "Product unavailable";
                          return (
                            <A
                              href={`/provider/dashboard/orders-bookings?recordId=${encodeURIComponent(record.entry_id)}`}
                              aria-label={`Open ${record.type} for ${productName}`}
                              title={`Open ${record.type}: ${productName}`}
                              class={`pointer-events-auto relative z-20 w-full truncate rounded-md border px-1.5 py-1 text-[10px] font-medium leading-tight hover:brightness-95 focus-visible:outline-2 focus-visible:outline-hunter-green-500 sm:px-2 sm:text-xs ${eventClass(record)}`}
                            >
                              <span class="hidden sm:inline">{record.type === "booking" ? "Booking" : "Order"} · </span>
                              {productName}
                            </A>
                          );
                        }}
                      </For>
                      <Show when={dayRecords().length > 2}>
                        <A
                          href={`/provider/dashboard/orders-bookings?date=${encodeURIComponent(dateKey(date))}`}
                          aria-label={`Open all ${dayRecords().length - 2} more events for ${formatFullDate(date)}`}
                          class="pointer-events-auto relative z-20 px-1 text-[10px] font-semibold text-dust-grey-text hover:text-hunter-green-500 sm:text-xs"
                        >
                          +{dayRecords().length - 2} more
                        </A>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-dust-grey-text">
            <span class="font-medium text-dust-grey-100">{monthRecords().length} entr{monthRecords().length === 1 ? "y" : "ies"} this month</span>
            <span class="inline-flex items-center gap-2"><span class="size-2.5 rounded-full bg-pine-teal-500" /> Bookings</span>
            <span class="inline-flex items-center gap-2"><span class="size-2.5 rounded-full bg-hunter-green-500" /> Orders</span>
            <span class="inline-flex items-center gap-2"><span class="size-2.5 rounded-full bg-rose-400" /> Cancelled</span>
          </div>
        </section>

        <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <section class="rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-fern-text">Selected day</p>
                <h2 class="mt-1 font-serif text-xl">{formatFullDate(selectedDate())}</h2>
              </div>
              <div class="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openCreateRecord("order")}
                  disabled={loading() || inventory().length === 0}
                  class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-hunter-green-500 px-3 text-xs font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarDays size={14} aria-hidden="true" /> Add order
                </button>
                <button
                  type="button"
                  onClick={() => openCreateRecord("booking")}
                  disabled={loading() || inventory().length === 0}
                  class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-pine-teal-400 bg-pine-teal-900 px-3 text-xs font-semibold text-pine-teal-300 transition hover:bg-pine-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarDays size={14} aria-hidden="true" /> Add booking
                </button>
              </div>
            </div>
            <Show when={recordSuccess()}>
              <p role="status" class="mt-4 rounded-xl border border-fern-700 bg-fern-900 px-4 py-3 text-sm text-fern-200">{recordSuccess()}</p>
            </Show>
            <Show when={selectedRecord()} fallback={
              <Show when={selectedEvents().length > 0} fallback={<p class="mt-5 rounded-xl border border-dashed border-dust-grey-600 px-4 py-6 text-sm text-dust-grey-text">No orders or bookings were created on this day.</p>}>
                <div class="mt-4 grid gap-3">
                  <For each={selectedEvents()}>
                    {(record) => (
                      <button type="button" onClick={() => setSelectedRecordId(record.entry_id)} class="flex w-full items-center justify-between gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-3 text-left transition hover:border-hunter-green-500">
                        <span class="min-w-0">
                          <span class="block truncate text-sm font-semibold text-dust-grey-100">{productById().get(record.product_id)?.name ?? "Product unavailable"}</span>
                          <span class="mt-1 block text-xs capitalize text-dust-grey-text">{record.type} · Created {formatDate(record.created_at)}</span>
                        </span>
                        <span class={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(record.status)}`}>{record.status}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            }>
              {(record) => (
                <div class="mt-4 rounded-xl border border-hunter-green-500/40 bg-dust-grey-800 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-wide text-fern-text">{record().type}</p>
                      <h3 class="mt-1 truncate font-serif text-lg text-dust-grey-100">{productById().get(record().product_id)?.name ?? "Product unavailable"}</h3>
                    </div>
                    <span class={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(record().status)}`}>{record().status}</span>
                  </div>
                  <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt class="text-xs text-dust-grey-text">Client reference</dt><dd class="mt-1 truncate font-mono text-xs text-dust-grey-100">{record().client_id}</dd></div>
                    <div><dt class="text-xs text-dust-grey-text">Start date</dt><dd class="mt-1 text-dust-grey-100">{formatDate(record().created_at)}</dd></div>
                    <div><dt class="text-xs text-dust-grey-text">Period</dt><dd class="mt-1 text-dust-grey-100">{record().period ? `${record().period} ${Number(record().period) === 1 ? "hour" : "hours"}` : "—"}</dd></div>
                    <div><dt class="text-xs text-dust-grey-text">Arrival time</dt><dd class="mt-1 text-dust-grey-100">{record().arrival_time ? formatTime(record().arrival_time) : "—"}</dd></div>
                    <div><dt class="text-xs text-dust-grey-text">Reference</dt><dd class="mt-1 truncate font-mono text-xs text-dust-grey-100">{record().entry_id}</dd></div>
                  </dl>
                  <button type="button" onClick={() => setSelectedRecordId("")} class="mt-4 text-xs font-semibold text-hunter-green-500 hover:underline">Back to day overview</button>
                </div>
              )}
            </Show>
          </section>

          <section class="rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-6">
            <div class="flex items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-fern-text">Quick guide</p>
                <h2 class="font-serif text-xl">Calendar notes</h2>
              </div>
            </div>
            <ol class="mt-5 space-y-3">
              <li class="flex gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-xs font-bold text-white">1</span>
                <p class="text-sm leading-5 text-dust-grey-200"><span class="font-semibold text-dust-grey-100">Choose a day.</span> Click any calendar date to select it; the selected date is highlighted in green.</p>
              </li>
              <li class="flex gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-xs font-bold text-white">2</span>
                <p class="text-sm leading-5 text-dust-grey-200"><span class="font-semibold text-dust-grey-100">Read the entries.</span> Green markers are orders; teal markers are bookings. Select a marker to open that record.</p>
              </li>
              <li class="flex gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-xs font-bold text-white">3</span>
                <p class="text-sm leading-5 text-dust-grey-200"><span class="font-semibold text-dust-grey-100">Add a record.</span> Select a day, then use Add order or Add booking in the selected-day panel. The chosen date is prefilled.</p>
              </li>
              <li class="flex gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-xs font-bold text-white">4</span>
                <p class="text-sm leading-5 text-dust-grey-200"><span class="font-semibold text-dust-grey-100">Check booking details.</span> Period is measured in hours; arrival time is the customer’s requested arrival time.</p>
              </li>
            </ol>
            <Show when={!loading() && !errorMessage() && records().length === 0}>
              <p class="mt-4 rounded-xl border border-dashed border-dust-grey-600 bg-dry-sage-900 px-4 py-3 text-sm text-dust-grey-200">No orders or bookings yet. Add one from the selected-day panel to get started.</p>
            </Show>
          </section>
        </div>

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
              aria-labelledby="calendar-record-title"
              class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
            >
              <div class="flex items-start justify-between gap-4 border-b border-dust-grey-600 p-5 sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Selected day · {formatDate(selectedDate())}</p>
                  <h2 id="calendar-record-title" class="mt-1 font-serif text-2xl text-dust-grey-100">Add {recordForm().type}</h2>
                  <p class="mt-1 text-sm text-dust-grey-text">Create an order or booking for {formatFullDate(selectedDate())}.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close record form"
                  onClick={closeRecordDrawer}
                  disabled={recordSaveLoading()}
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-text transition hover:bg-dust-grey-800 disabled:opacity-50"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <form class="flex flex-1 flex-col" onSubmit={saveCalendarRecord}>
                <div class="flex-1 space-y-5 p-5 sm:p-7">
                  <Show when={recordSaveError()}>
                    <p role="alert" class="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{recordSaveError()}</p>
                  </Show>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Record type
                    <select
                      class={inputClass + " mt-1"}
                      value={recordForm().type}
                      disabled={recordSaveLoading()}
                      onChange={(event) => setRecordForm((current) => ({ ...current, type: event.currentTarget.value }))}
                    >
                      <option value="order">Order</option>
                      <option value="booking">Booking</option>
                    </select>
                  </label>
                  <label class="block text-sm font-medium text-dust-grey-200">
                    Product
                    <select
                      class={inputClass + " mt-1"}
                      required
                      value={recordForm().product_id}
                      disabled={recordSaveLoading() || inventory().length === 0}
                      onChange={(event) => setRecordForm((current) => ({ ...current, product_id: event.currentTarget.value }))}
                    >
                      <option value="" disabled>Select a provider product</option>
                      <For each={inventory()}>{(product) => (
                        <option value={product.product_id}>{product.name || "Untitled product"}</option>
                      )}</For>
                    </select>
                    <Show when={!inventory().length}>
                      <span class="mt-1 block text-xs text-dust-grey-text">Add a product to your inventory before creating a record.</span>
                    </Show>
                  </label>
                  <div class="rounded-2xl border border-dust-grey-600 bg-dust-grey-800/50 p-4">
                    <p class="text-sm font-semibold text-dust-grey-100">Customer</p>
                    <div class="mt-3 flex gap-2">
                      <label class="min-w-0 flex-1">
                        <span class="sr-only">Customer phone number</span>
                        <input
                          class={inputClass}
                          type="tel"
                          inputmode="tel"
                          autocomplete="tel"
                          placeholder="e.g. 0712 345 678"
                          value={customerPhone()}
                          disabled={customerLookupLoading() || recordSaveLoading()}
                          onInput={(event) => setCustomerPhone(event.currentTarget.value)}
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
                        disabled={customerLookupLoading() || recordSaveLoading()}
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
                          <span class="mt-0.5 block break-all text-xs text-dust-grey-text">{selectedCustomer().phone}</span>
                        </span>
                      </div>
                    </Show>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="block text-sm font-medium text-dust-grey-200">
                      Quantity
                      <input
                        class={inputClass + " mt-1"}
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
                        class={inputClass + " mt-1"}
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
                        class={inputClass + " mt-1"}
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
                    disabled={recordSaveLoading() || inventory().length === 0}
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Show when={recordSaveLoading()} fallback={<Plus size={16} aria-hidden="true" />}>
                      <LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
                    </Show>
                    {recordSaveLoading() ? "Saving…" : `Create ${recordForm().type}`}
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
