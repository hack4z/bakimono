import { A } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  UsersRound,
} from "lucide-solid";
import AnalyticsChart from "~/components/AnalyticsChart";
import LoadingState from "~/components/LoadingState";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { getSupabaseErrorMessage } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";
import { getCurrentProvider } from "~/utils/provider-data";

const ranges = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "12m", label: "Last 12 months", months: 12 },
];
const statuses = ["checkout", "pending", "ongoing", "success", "completed", "cancelled"];
const statusNames = {
  checkout: "Checkout",
  pending: "Pending",
  ongoing: "Ongoing",
  success: "Success",
  completed: "Completed",
  cancelled: "Cancelled",
};
const ageBuckets = [
  { value: "under_24_hours", label: "Under 24 hours" },
  { value: "1_to_3_days", label: "1–3 days" },
  { value: "4_to_7_days", label: "4–7 days" },
  { value: "over_7_days", label: "Over 7 days" },
];
const inputClass =
  "h-10 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none transition focus:border-hunter-green-500 focus:ring-2 focus:ring-hunter-green-500/15";

function utcDate(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRanges(range, selectedDay) {
  if (selectedDay) {
    const start = new Date(`${selectedDay}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const previousStart = new Date(start);
    previousStart.setUTCDate(previousStart.getUTCDate() - 1);
    return { start, end, previousStart, previousEnd: start, day: selectedDay };
  }

  const end = new Date();
  const selectedRange = ranges.find((item) => item.value === range);
  const endDate = utcDate(end);
  const start = new Date(endDate);
  if (selectedRange?.months) {
    start.setUTCMonth(start.getUTCMonth() - selectedRange.months);
  } else {
    start.setUTCDate(start.getUTCDate() - (selectedRange?.days ?? 7) + 1);
  }
  const normalizedStart = utcDate(start);
  const previousEnd = normalizedStart;
  const previousStart = new Date(normalizedStart);
  if (selectedRange?.months) {
    previousStart.setUTCMonth(previousStart.getUTCMonth() - selectedRange.months);
  } else {
    previousStart.setUTCDate(previousStart.getUTCDate() - (selectedRange?.days ?? 7));
  }
  return { start: normalizedStart, end, previousStart: utcDate(previousStart), previousEnd, day: null };
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function currency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function shortCurrency(value) {
  const number = Number(value ?? 0);
  if (number >= 1000000) return `KSh ${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `KSh ${(number / 1000).toFixed(1)}K`;
  return `KSh ${number.toLocaleString()}`;
}

const emptyAnalyticsSummary = () => ({
  orders: 0,
  bookings: 0,
  customers: 0,
  pending_orders: 0,
  pending_bookings: 0,
  ongoing_orders: 0,
  ongoing_bookings: 0,
  checkout_orders: 0,
  checkout_bookings: 0,
  success: 0,
  completed: 0,
  cancelled: 0,
  resolved: 0,
  first_time_customers: 0,
  returning_customers: 0,
});

async function fetchAllRows(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await buildQuery().range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

async function loadAnalyticsSnapshot(providerId, filters, bounds) {
  const products = await fetchAllRows(() => supabase
    .from("products")
    .select("product_id, name")
    .eq("provider_id", providerId)
    .order("name", { ascending: true }));
  const productNames = new Map(products.map((product) => [product.product_id, product.name || product.product_id]));
  const providerProductIds = products.map((product) => product.product_id);
  const productIds = providerProductIds.filter((id) => filters.productId === "all" || id === filters.productId);
  const recordTypes = filters.recordType === "orders"
    ? [["orders", "order"]]
    : filters.recordType === "bookings"
      ? [["bookings", "booking"]]
      : [["orders", "order"], ["bookings", "booking"]];
  const rowsByType = await Promise.all(recordTypes.map(async ([table, type]) => {
    const rows = [];
    for (let offset = 0; offset < productIds.length; offset += 100) {
      const ids = productIds.slice(offset, offset + 100);
      rows.push(...await fetchAllRows(() => {
        let query = supabase
          .from(table)
          .select("entry_id, created_at, status, client_id, product_id")
          .in("product_id", ids)
          .gte("created_at", bounds.previousStart.toISOString())
          .lt("created_at", bounds.end.toISOString())
          .order("created_at", { ascending: false });
        if (filters.status !== "all") query = query.eq("status", filters.status);
        return query;
      }));
    }
    return rows.map((row) => ({
      ...row,
      type,
      product_name: productNames.get(row.product_id) ?? row.product_id,
    }));
  }));
  const records = rowsByType.flat();
  const currentRecords = records.filter((row) => {
    const createdAt = new Date(row.created_at);
    return createdAt >= bounds.start && createdAt < bounds.end;
  });
  const previousRecords = records.filter((row) => {
    const createdAt = new Date(row.created_at);
    return createdAt >= bounds.previousStart && createdAt < bounds.previousEnd;
  });
  const summarize = (items) => {
    const summary = emptyAnalyticsSummary();
    const customers = new Map();
    for (const item of items) {
      const order = item.type === "order";
      const field = order ? "orders" : "bookings";
      summary[field] += 1;
      if (item.client_id) customers.set(item.client_id, (customers.get(item.client_id) ?? 0) + 1);
      if (["pending", "ongoing", "checkout"].includes(item.status)) {
        summary[`${item.status}_${field}`] += 1;
      }
      if (item.status === "success" || item.status === "completed" || item.status === "cancelled") {
        summary[item.status] += 1;
      }
    }
    summary.customers = customers.size;
    summary.first_time_customers = [...customers.values()].filter((count) => count === 1).length;
    summary.returning_customers = [...customers.values()].filter((count) => count >= 2).length;
    summary.resolved = summary.success + summary.completed + summary.cancelled;
    return summary;
  };
  const statusCounts = new Map();
  const dailyCounts = new Map();
  const productCounts = new Map();
  const workloadCounts = new Map();
  const now = Date.now();
  for (const item of currentRecords) {
    const order = item.type === "order";
    const status = statusCounts.get(item.status) ?? { status: item.status, orders: 0, bookings: 0 };
    status[order ? "orders" : "bookings"] += 1;
    statusCounts.set(item.status, status);

    const date = new Date(item.created_at).toISOString().slice(0, 10);
    const daily = dailyCounts.get(date) ?? { date, orders: 0, bookings: 0 };
    daily[order ? "orders" : "bookings"] += 1;
    dailyCounts.set(date, daily);

    const product = productCounts.get(item.product_id) ?? {
      product_id: item.product_id,
      name: item.product_name,
      orders: 0,
      bookings: 0,
    };
    product[order ? "orders" : "bookings"] += 1;
    productCounts.set(item.product_id, product);

    if (["pending", "ongoing"].includes(item.status)) {
      const age = now - new Date(item.created_at).getTime();
      const ageBucket = age < 24 * 60 * 60 * 1000
        ? "under_24_hours"
        : age < 3 * 24 * 60 * 60 * 1000
          ? "1_to_3_days"
          : age < 7 * 24 * 60 * 60 * 1000 ? "4_to_7_days" : "over_7_days";
      const workload = workloadCounts.get(ageBucket) ?? { age_bucket: ageBucket, orders: 0, bookings: 0 };
      workload[order ? "orders" : "bookings"] += 1;
      workloadCounts.set(ageBucket, workload);
    }
  }

  const paidStatuses = ["paid", "completed", "complete", "successful", "success"];
  const paymentRows = [];
  for (let offset = 0; offset < providerProductIds.length; offset += 100) {
    const ids = providerProductIds.slice(offset, offset + 100);
    paymentRows.push(...await fetchAllRows(() => supabase
      .from("transactions")
      .select("created_at, amount, product_id")
      .in("product_id", ids)
      .in("status", paidStatuses)
      .gte("created_at", bounds.previousStart.toISOString())
      .lt("created_at", bounds.end.toISOString())
      .order("created_at", { ascending: true })));
  }
  const payments = { current: 0, previous: 0 };
  const dailyPayments = new Map();
  for (const payment of paymentRows) {
    const createdAt = new Date(payment.created_at);
    const amount = Number(payment.amount ?? 0);
    if (createdAt >= bounds.start && createdAt < bounds.end) {
      payments.current += amount;
      const date = createdAt.toISOString().slice(0, 10);
      dailyPayments.set(date, (dailyPayments.get(date) ?? 0) + amount);
    } else if (createdAt >= bounds.previousStart && createdAt < bounds.previousEnd) {
      payments.previous += amount;
    }
  }

  const statusOrder = ["checkout", "pending", "ongoing", "success", "completed", "cancelled"];
  const workloadOrder = ["under_24_hours", "1_to_3_days", "4_to_7_days", "over_7_days"];
  return {
    current: summarize(currentRecords),
    previous: summarize(previousRecords),
    payments,
    statuses: statusOrder.map((status) => statusCounts.get(status) ?? { status, orders: 0, bookings: 0 }),
    daily: [...dailyCounts.values()].sort((first, second) => first.date.localeCompare(second.date)),
    dailyPayments: [...dailyPayments].map(([date, amount]) => ({ date, amount }))
      .sort((first, second) => first.date.localeCompare(second.date)),
    products: [...productCounts.values()]
      .sort((first, second) => second.orders + second.bookings - first.orders - first.bookings
        || first.name.localeCompare(second.name))
      .slice(0, 10),
    workload: workloadOrder.map((age_bucket) => workloadCounts.get(age_bucket))
      .filter(Boolean),
    recent: currentRecords
      .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
      .slice(0, 12),
  };
}

function comparison(current, previous, isRate = false) {
  if (previous == null || !Number.isFinite(Number(previous))) return "Previous period unavailable";
  if (isRate) {
    const change = Number(current) - Number(previous);
    if (change === 0) return "No change vs previous period";
    return `${change > 0 ? "+" : ""}${change.toFixed(1)} percentage points vs previous`;
  }
  if (Number(previous) === 0) {
    return Number(current) === 0 ? "No change vs previous period" : "No prior records to compare";
  }
  const change = ((Number(current) - Number(previous)) / Number(previous)) * 100;
  if (change === 0) return "No change vs previous period";
  return `${change > 0 ? "+" : ""}${Math.round(change)}% vs previous period`;
}

function baseChart(theme) {
  return {
    aria: { enabled: true },
    animationDuration: 550,
    textStyle: { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" },
    tooltip: {
      backgroundColor: theme.surface,
      borderColor: theme.grid,
      borderWidth: 1,
      textStyle: { color: theme.text },
      extraCssText: "border-radius: 12px; box-shadow: 0 12px 35px rgb(0 0 0 / 0.18);",
    },
  };
}

function MetricCard(props) {
  return (
    <article class="rounded-[22px] border border-dust-grey-600 bg-dry-sage-900 p-4 sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-medium text-dust-grey-text">{props.label}</p>
          <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-dust-grey-100">{props.value}</p>
        </div>
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hunter-green-500/10 text-hunter-green-500">
          <props.Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <p class="mt-3 text-xs leading-5 text-dust-grey-text">{props.detail}</p>
      <p class="mt-1 text-[11px] leading-4 text-dust-grey-400">{props.comparison}</p>
    </article>
  );
}

function AnalyticsFilters(props) {
  return (
    <section aria-label="Analytics filters" class="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-dust-grey-600 bg-dry-sage-900 p-4">
      <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
        <span>Date range · UTC</span>
        <select
          aria-label="Date range"
          class={inputClass}
          value={props.range()}
          onChange={(event) => {
            props.setRange(event.currentTarget.value);
            props.setSelectedDay(null);
          }}
          disabled={Boolean(props.selectedDay())}
        >
          <For each={ranges}>{(item) => <option value={item.value}>{item.label}</option>}</For>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
        <span>Records</span>
        <select
          aria-label="Record type"
          class={inputClass}
          value={props.recordType()}
          onChange={(event) => props.setRecordType(event.currentTarget.value)}
        >
          <option value="all">Orders &amp; bookings</option>
          <option value="orders">Orders only</option>
          <option value="bookings">Bookings only</option>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
        <span>Current status</span>
        <select
          aria-label="Current status"
          class={inputClass}
          value={props.status()}
          onChange={(event) => props.setStatus(event.currentTarget.value)}
        >
          <option value="all">All statuses</option>
          <For each={statuses}>{(status) => <option value={status}>{statusNames[status]}</option>}</For>
        </select>
      </label>
      <label class="grid min-w-48 flex-1 gap-1 text-xs font-medium text-dust-grey-text sm:max-w-xs">
        <span>Product</span>
        <select
          aria-label="Product"
          class={inputClass}
          value={props.productId()}
          onChange={(event) => props.setProductId(event.currentTarget.value)}
        >
          <option value="all">All products</option>
          <For each={props.products()}>{(product) => (
            <option value={product.product_id}>{product.name}</option>
          )}</For>
        </select>
      </label>
      <Show when={props.selectedDay()}>
        <button
          type="button"
          onClick={() => props.setSelectedDay(null)}
          class="h-10 rounded-xl border border-hunter-green-500/30 bg-hunter-green-500/10 px-3 text-xs font-semibold text-hunter-green-500 hover:bg-hunter-green-500/15"
        >
          Clear day: {props.selectedDay()}
        </button>
      </Show>
      <button
        type="button"
        onClick={props.onRefresh}
        disabled={props.loading()}
        class="inline-flex h-10 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw size={15} class={props.loading() ? "animate-spin" : ""} aria-hidden="true" />
        {props.loading() ? "Refreshing" : "Refresh"}
      </button>
      <Show when={props.hasFilters()}>
        <button
          type="button"
          onClick={props.onClear}
          class="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-dust-grey-text hover:bg-dust-grey-800 hover:text-dust-grey-100"
        >
          <RotateCcw size={14} aria-hidden="true" /> Clear filters
        </button>
      </Show>
    </section>
  );
}

function ActivityTrendChart(props) {
  const option = (theme) => ({
    ...baseChart(theme),
    color: [theme.primary, theme.secondary],
    tooltip: {
      ...baseChart(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "cross", label: { backgroundColor: theme.primary } },
      formatter: (items) => {
        const label = items[0]?.axisValue ?? "";
        return [
          `<strong>${label}</strong>`,
          ...items.map((item) => `${item.marker} ${item.seriesName}: ${formatNumber(item.value)}`),
        ].join("<br/>");
      },
    },
    legend: { top: 0, right: 8, textStyle: { color: theme.muted } },
    grid: { top: 42, left: 12, right: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: props.points().map((point) => point.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: theme.muted, hideOverlap: true, interval: "auto" },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: theme.muted },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.grid, type: "dashed", opacity: 0.7 } },
    },
    series: [
      { name: "Orders", type: "line", smooth: 0.35, showSymbol: props.points().length < 20, symbolSize: 7, lineStyle: { width: 3, shadowBlur: 10, shadowColor: theme.primary }, areaStyle: { opacity: 0.13 }, data: props.points().map((point) => point.orders) },
      { name: "Bookings", type: "line", smooth: 0.35, showSymbol: props.points().length < 20, symbolSize: 7, lineStyle: { width: 3, shadowBlur: 10, shadowColor: theme.secondary }, areaStyle: { opacity: 0.1 }, data: props.points().map((point) => point.bookings) },
    ],
  });

  return <AnalyticsChart label="Orders and bookings created over time" getOption={option} onChartClick={(event) => {
    const point = props.points()[event.dataIndex];
    if (point?.date) props.onSelectDay(point.date);
  }} class="h-72 w-full" />;
}

function StatusComparisonChart(props) {
  const option = (theme) => ({
    ...baseChart(theme),
    color: [theme.statusColors.checkout, theme.statusColors.pending, theme.statusColors.ongoing, theme.statusColors.completed, theme.statusColors.completed, theme.statusColors.cancelled],
    tooltip: {
      ...baseChart(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const type = items[0]?.axisValue ?? "";
        const denominator = type === "Orders" ? props.snapshot().current.orders : props.snapshot().current.bookings;
        const rows = items.filter((item) => Number(item.value) > 0).map((item) => {
          const percent = denominator ? Math.round((Number(item.value) / denominator) * 100) : 0;
          return `${item.marker} ${item.seriesName}: ${item.value} (${percent}% of ${denominator} ${type.toLowerCase()})`;
        });
        return [`<strong>${type}</strong>`, ...(rows.length ? rows : ["No records"])].join("<br/>");
      },
    },
    legend: { top: 0, right: 8, textStyle: { color: theme.muted }, itemWidth: 9, itemHeight: 9 },
    grid: { top: 38, left: 16, right: 20, bottom: 8, containLabel: true },
    xAxis: { type: "value", minInterval: 1, axisLabel: { color: theme.muted }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: theme.grid, type: "dashed" } } },
    yAxis: { type: "category", data: ["Orders", "Bookings"], axisLabel: { color: theme.text }, axisTick: { show: false }, axisLine: { show: false } },
    series: statuses.map((status) => ({
      name: statusNames[status],
      type: "bar",
      stack: "records",
      barWidth: 34,
      itemStyle: { borderRadius: status === "checkout" ? [8, 0, 0, 8] : status === "cancelled" ? [0, 8, 8, 0] : 0 },
      emphasis: { focus: "series" },
      data: [
        { value: props.snapshot().statuses.find((item) => item.status === status)?.orders ?? 0, status },
        { value: props.snapshot().statuses.find((item) => item.status === status)?.bookings ?? 0, status },
      ],
    })),
  });
  return <AnalyticsChart label="Stacked comparison of current order and booking statuses" getOption={option} onChartClick={(event) => {
    const status = statuses.find((item) => statusNames[item] === event.seriesName);
    if (status) props.onSelectStatus(status);
  }} class="h-64 w-full" />;
}

function ProductDemandChart(props) {
  const option = (theme) => ({
    ...baseChart(theme),
    color: [theme.primary, theme.secondary],
    tooltip: {
      ...baseChart(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => [
        `<strong>${escapeHtml(items[0]?.axisValue ?? "Product")}</strong>`,
        ...items.map((item) => `${item.marker} ${item.seriesName}: ${formatNumber(item.value)}`),
      ].join("<br/>"),
    },
    legend: { top: 0, right: 8, textStyle: { color: theme.muted } },
    grid: { top: 42, left: 12, right: 18, bottom: 8, containLabel: true },
    xAxis: { type: "value", minInterval: 1, axisLabel: { color: theme.muted }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: theme.grid, type: "dashed" } } },
    yAxis: { type: "category", inverse: true, data: props.products().map((product) => product.name), axisLabel: { color: theme.text, width: 150, overflow: "truncate" }, axisTick: { show: false }, axisLine: { show: false } },
    series: [
      { name: "Orders", type: "bar", barMaxWidth: 18, itemStyle: { borderRadius: [0, 6, 6, 0] }, data: props.products().map((product) => ({ value: product.orders, product_id: product.product_id })) },
      { name: "Bookings", type: "bar", barMaxWidth: 18, itemStyle: { borderRadius: [0, 6, 6, 0] }, data: props.products().map((product) => ({ value: product.bookings, product_id: product.product_id })) },
    ],
  });
  return <AnalyticsChart label="Top products ranked by order and booking counts" getOption={option} onChartClick={(event) => {
    const productId = event.data?.product_id ?? props.products()[event.dataIndex]?.product_id;
    if (productId) props.onSelectProduct(productId);
  }} class="h-80 w-full" />;
}

function PaymentTrendChart(props) {
  const option = (theme) => ({
    ...baseChart(theme),
    color: [theme.primary, theme.secondary],
    tooltip: {
      ...baseChart(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "cross", label: { backgroundColor: theme.primary } },
      formatter: (items) => [
        `<strong>${items[0]?.axisValue ?? "Period"}</strong>`,
        ...items.map((item) => `${item.marker} ${item.seriesName}: ${currency(item.value)}`),
      ].join("<br/>"),
    },
    legend: { top: 0, right: 8, textStyle: { color: theme.muted } },
    grid: { top: 42, left: 12, right: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: props.points().map((point) => point.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: theme.muted, hideOverlap: true, interval: "auto" },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: theme.muted, formatter: (value) => shortCurrency(value) },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.grid, type: "dashed", opacity: 0.7 } },
    },
    series: [
      { name: "Confirmed payments", type: "line", smooth: 0.35, showSymbol: props.points().length < 20, symbolSize: 7, lineStyle: { width: 3 }, areaStyle: { opacity: 0.13 }, data: props.points().map((point) => point.amount ?? 0) },
    ],
  });
  return <AnalyticsChart label="Confirmed M-PESA payments over time in Kenyan shillings" getOption={option} class="h-72 w-full" />;
}

function WorkloadAgeChart(props) {
  const option = (theme) => ({
    ...baseChart(theme),
    color: [theme.warning, theme.danger],
    tooltip: {
      ...baseChart(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => [
        `<strong>${items[0]?.axisValue ?? "Age"}</strong>`,
        ...items.map((item) => `${item.marker} ${item.seriesName}: ${formatNumber(item.value)}`),
        "Age is measured from record creation, not current status entry.",
      ].join("<br/>"),
    },
    legend: { top: 0, right: 8, textStyle: { color: theme.muted } },
    grid: { top: 42, left: 12, right: 16, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: ageBuckets.map((item) => item.label), axisLabel: { color: theme.muted, interval: 0, hideOverlap: true }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: theme.muted }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: theme.grid, type: "dashed" } } },
    series: [
      { name: "Orders", type: "bar", stack: "open", barMaxWidth: 34, itemStyle: { borderRadius: [6, 6, 0, 0] }, data: ageBuckets.map((bucket) => props.workload().find((item) => item.age_bucket === bucket.value)?.orders ?? 0) },
      { name: "Bookings", type: "bar", stack: "open", barMaxWidth: 34, itemStyle: { borderRadius: [6, 6, 0, 0] }, data: ageBuckets.map((bucket) => props.workload().find((item) => item.age_bucket === bucket.value)?.bookings ?? 0) },
    ],
  });
  return <AnalyticsChart label="Currently pending and ongoing records grouped by record age" getOption={option} class="h-64 w-full" />;
}

function CustomerRepeatChart(props) {
  const option = (theme) => ({
    ...baseChart(theme),
    color: [theme.secondary, theme.success],
    tooltip: {
      ...baseChart(theme).tooltip,
      trigger: "item",
      formatter: ({ name, value, percent }) => `${name}: ${formatNumber(value)} customers (${percent}%)`,
    },
    legend: { bottom: 0, left: "center", textStyle: { color: theme.muted } },
    series: [{
      name: "Customers in this period",
      type: "pie",
      radius: ["55%", "78%"],
      center: ["50%", "45%"],
      padAngle: 3,
      itemStyle: { borderColor: theme.surface, borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      emphasis: { scale: 1.05 },
      data: [
        { name: "First-time (one record)", value: props.summary().first_time_customers },
        { name: "Returning (2+ records)", value: props.summary().returning_customers },
      ],
    }],
  });
  return <AnalyticsChart label="Customer activity split between one record and two or more records in this period" getOption={option} centerValue={props.summary().customers} centerLabel="customers" class="h-64 w-full" />;
}

function RecentActivityTable(props) {
  return (
    <section class="mt-5 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dry-sage-900">
      <header class="flex flex-wrap items-end justify-between gap-2 border-b border-dust-grey-600 px-5 py-4 sm:px-6">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.15em] text-hunter-green-500">Latest records</p>
          <h2 class="mt-1 font-serif text-xl">Recent activity</h2>
        </div>
        <span class="text-xs text-dust-grey-text">Creation dates shown in UTC</span>
      </header>
      <Show when={props.records().length > 0} fallback={
        <p class="px-5 py-8 text-center text-sm text-dust-grey-text">No records match these filters.</p>
      }>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="bg-dust-grey-800 text-[11px] uppercase tracking-wide text-dust-grey-text">
              <tr>
                <th scope="col" class="px-5 py-3 font-semibold">Created (UTC)</th>
                <th scope="col" class="px-5 py-3 font-semibold">Type</th>
                <th scope="col" class="px-5 py-3 font-semibold">Product</th>
                <th scope="col" class="px-5 py-3 font-semibold">Current status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dust-grey-600">
              <For each={props.records()}>{(record) => (
                <tr>
                  <td class="whitespace-nowrap px-5 py-3 text-dust-grey-200">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(record.created_at))}
                  </td>
                  <td class="px-5 py-3 capitalize text-dust-grey-100">{record.type}</td>
                  <td class="max-w-64 truncate px-5 py-3 text-dust-grey-200" title={record.product_name}>{record.product_name}</td>
                  <td class="px-5 py-3">
                    <span class="inline-flex rounded-full bg-dust-grey-800 px-2.5 py-1 text-xs font-medium capitalize text-dust-grey-100">
                      {statusNames[record.status] ?? record.status}
                    </span>
                  </td>
                </tr>
              )}</For>
            </tbody>
          </table>
        </div>
      </Show>
    </section>
  );
}

export default function ProviderAnalyticsPage() {
  const [range, setRange] = createSignal("30");
  const [recordType, setRecordType] = createSignal("all");
  const [status, setStatus] = createSignal("all");
  const [productId, setProductId] = createSignal("all");
  const [selectedDay, setSelectedDay] = createSignal(null);
  const [refreshVersion, setRefreshVersion] = createSignal(0);
  const [snapshot, setSnapshot] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  let requestVersion = 0;

  const productOptions = createMemo(() => snapshot()?.products ?? []);
  const activityDays = createMemo(() => {
    if (!snapshot()) return [];
    const bounds = getDateRanges(range(), selectedDay());
    const counts = new Map(snapshot().daily.map((item) => [item.date, item]));
    const first = utcDate(bounds.start);
    const last = utcDate(new Date(bounds.end.getTime() - 1));
    const days = [];
    for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = isoDate(cursor);
      const count = counts.get(date);
      days.push({
        date,
        orders: count?.orders ?? 0,
        bookings: count?.bookings ?? 0,
      });
    }
    return days;
  });
  const trendPoints = createMemo(() => {
    const days = activityDays();
    const mode = selectedDay() || range() === "7" || range() === "30"
      ? "day"
      : range() === "90" ? "week" : "month";
    const groups = new Map();
    for (const day of days) {
      const date = new Date(`${day.date}T00:00:00.000Z`);
      let key = day.date;
      let label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
      if (mode === "week") {
        const monday = new Date(date);
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
        key = isoDate(monday);
        label = `Week of ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(monday)}`;
      } else if (mode === "month") {
        key = day.date.slice(0, 7);
        label = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
      }
      const point = groups.get(key) ?? { date: day.date, label, orders: 0, bookings: 0 };
      point.orders += day.orders;
      point.bookings += day.bookings;
      groups.set(key, point);
    }
    return [...groups.values()];
  });
  const paymentTrendPoints = createMemo(() => {
    const mapped = new Map();
    const byDate = snapshot()?.dailyPayments ?? [];
    const mode = selectedDay() || range() === "7" || range() === "30"
      ? "day"
      : range() === "90" ? "week" : "month";
    const bucketForDate = (dateValue) => {
      const date = new Date(`${dateValue}T00:00:00.000Z`);
      let key = dateValue;
      let label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
      if (mode === "week") {
        const monday = new Date(date);
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
        key = isoDate(monday);
        label = `Week of ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(monday)}`;
      } else if (mode === "month") {
        key = dateValue.slice(0, 7);
        label = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
      }
      return { key, point: { date: dateValue, label, amount: 0 } };
    };
    for (const day of activityDays()) {
      const { key, point } = bucketForDate(day.date);
      if (!mapped.has(key)) mapped.set(key, point);
    }
    for (const item of byDate) {
      const { key, point: emptyPoint } = bucketForDate(item.date);
      const point = mapped.get(key) ?? emptyPoint;
      point.amount += Number(item.amount ?? 0);
      mapped.set(key, point);
    }
    return [...mapped.values()].sort((first, second) => first.date.localeCompare(second.date));
  });
  const hasFilters = createMemo(() =>
    recordType() !== "all"
    || status() !== "all"
    || productId() !== "all"
    || Boolean(selectedDay())
    || range() !== "30",
  );

  createEffect(() => {
    const filters = {
      range: range(),
      recordType: recordType(),
      status: status(),
      productId: productId(),
      selectedDay: selectedDay(),
      refreshVersion: refreshVersion(),
    };
    const version = ++requestVersion;
    setLoading(true);
    setErrorMessage("");
    onCleanup(() => { requestVersion += 1; });

    const load = async () => {
      try {
        const { providerId } = await getCurrentProvider();
        const bounds = getDateRanges(filters.range, filters.selectedDay);
        const snapshotData = await loadAnalyticsSnapshot(providerId, filters, bounds);
        if (version === requestVersion) setSnapshot(snapshotData);
      } catch (error) {
        if (version === requestVersion) {
          setErrorMessage(getSupabaseErrorMessage(error, "Unable to load analytics."));
        }
      } finally {
        if (version === requestVersion) setLoading(false);
      }
    };
    void load();
  });

  function clearFilters() {
    setRange("30");
    setRecordType("all");
    setStatus("all");
    setProductId("all");
    setSelectedDay(null);
  }

  const summary = () => snapshot()?.current;
  const previous = () => snapshot()?.previous;
  const completionRate = () => {
    const resolved = Number(summary()?.resolved ?? 0);
    return resolved ? ((Number(summary().success) + Number(summary().completed)) / resolved) * 100 : 0;
  };
  const cancellationRate = () => {
    const resolved = Number(summary()?.resolved ?? 0);
    return resolved ? (Number(summary().cancelled) / resolved) * 100 : 0;
  };
  const previousCompletionRate = () => {
    const resolved = Number(previous()?.resolved ?? 0);
    return resolved ? ((Number(previous().success) + Number(previous().completed)) / resolved) * 100 : null;
  };
  const previousCancellationRate = () => {
    const resolved = Number(previous()?.resolved ?? 0);
    return resolved ? (Number(previous().cancelled) / resolved) * 100 : null;
  };
  const workloadTotal = () => Number(summary()?.pending_orders ?? 0)
    + Number(summary()?.pending_bookings ?? 0)
    + Number(summary()?.ongoing_orders ?? 0)
    + Number(summary()?.ongoing_bookings ?? 0);
  const dayRangeLabel = () => selectedDay()
    ? `${selectedDay()} (UTC)`
    : `${ranges.find((item) => item.value === range())?.label} · UTC`;

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-12 pt-7 text-dust-grey-100 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <header class="relative overflow-hidden rounded-7 border border-hunter-green-400 bg-linear-to-br from-hunter-green-500 via-pine-teal-500 to-fern-500 p-5 text-white shadow-sm sm:p-7 lg:p-8">
          <div aria-hidden="true" class="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-white/15" />
          <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 right-40 size-72 rounded-full border border-white/10" />
          <div class="relative flex flex-wrap items-end justify-between gap-5">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Provider workspace</p>
              <h1 class="mt-1 font-serif text-3xl tracking-[-0.04em] sm:text-[38px]">Sales &amp; performance</h1>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-white/85">
                Marketplace activity, current outcomes, product demand, and open workload.
              </p>
              <p class="mt-2 text-xs text-white/75">Reporting window: {dayRangeLabel()}</p>
            </div>
            <div class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/85">
              <BarChart3 size={15} aria-hidden="true" />
              <span>RLS-protected results</span>
            </div>
          </div>
        </header>

        <AnalyticsFilters
          range={range}
          setRange={setRange}
          recordType={recordType}
          setRecordType={setRecordType}
          status={status}
          setStatus={setStatus}
          productId={productId}
          setProductId={setProductId}
          products={productOptions}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          loading={loading}
          onRefresh={() => setRefreshVersion((version) => version + 1)}
          onClear={clearFilters}
          hasFilters={hasFilters}
        />

        <p role="note" class="mt-4 rounded-xl border border-dust-grey-600 bg-dry-sage-900 px-4 py-3 text-xs leading-5 text-dust-grey-text">
          Dates use UTC. Records are selected by creation time; statuses are their current values. Marketplace records and confirmed M-PESA payments are scoped to this provider membership. Record type, status, and product filters affect marketplace metrics; payment totals use the reporting date range only.
        </p>

        <Show when={errorMessage()}>
          <div role="alert" class="mt-5 rounded-2xl border border-rose-400/40 bg-rose-50 px-4 py-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            <p class="font-semibold">Analytics could not be loaded.</p>
            <p class="mt-1 break-words">{errorMessage()}</p>
            <p class="mt-2 text-xs">Confirm your authenticated account can read the provider's products, orders, bookings, and M-PESA payments.</p>
          </div>
        </Show>

        <Show when={!snapshot() && loading()}><LoadingState class="mt-5" label="Loading analytics…" /></Show>

        <Show when={snapshot()}>
          <Show when={loading()}>
            <p role="status" class="mt-4 inline-flex items-center gap-2 text-xs text-dust-grey-text">
              <RefreshCw size={13} class="animate-spin" aria-hidden="true" /> Updating these filters…
            </p>
          </Show>

          <Show when={Number(summary().orders) + Number(summary().bookings) === 0}>
            <p role="status" class="mt-5 rounded-xl border border-dust-grey-600 bg-dry-sage-900 px-4 py-3 text-sm text-dust-grey-text">
              No marketplace records match these filters. Marketplace metrics and charts are empty; payment totals reflect the reporting date range.
            </p>
          </Show>
            <section aria-label="Marketplace overview metrics" class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <MetricCard
                label="Orders created"
                value={formatNumber(summary().orders)}
                detail="Created in the selected window"
                comparison={comparison(summary().orders, previous().orders)}
                Icon={ShoppingBag}
              />
              <MetricCard
                label="Bookings created"
                value={formatNumber(summary().bookings)}
                detail="Created in the selected window"
                comparison={comparison(summary().bookings, previous().bookings)}
                Icon={CalendarDays}
              />
              <MetricCard
                label="Paid M-PESA"
                value={currency(snapshot().payments?.current ?? 0)}
                detail="Confirmed payments in the selected window"
                comparison={comparison(snapshot().payments?.current ?? 0, snapshot().payments?.previous ?? 0)}
                Icon={ShoppingBag}
              />
              <MetricCard
                label="Distinct customers"
                value={formatNumber(summary().customers)}
                detail="Deduplicated across selected record types"
                comparison={comparison(summary().customers, previous().customers)}
                Icon={UsersRound}
              />
              <MetricCard
                label="Pending workload"
                value={formatNumber(workloadTotal())}
                detail={`Pending O/B ${formatNumber(summary().pending_orders)}/${formatNumber(summary().pending_bookings)} · Ongoing O/B ${formatNumber(summary().ongoing_orders)}/${formatNumber(summary().ongoing_bookings)}`}
                comparison={`Checkout separate · O/B ${formatNumber(summary().checkout_orders)}/${formatNumber(summary().checkout_bookings)}`}
                Icon={ClipboardList}
              />
              <MetricCard
                label="Success rate"
                value={`${completionRate().toFixed(1)}%`}
                detail={`${formatNumber(Number(summary().success) + Number(summary().completed))} successful / ${formatNumber(summary().resolved)} resolved`}
                comparison={comparison(completionRate(), previousCompletionRate(), true)}
                Icon={CheckCircle2}
              />
              <MetricCard
                label="Cancellation rate"
                value={`${cancellationRate().toFixed(1)}%`}
                detail={`${formatNumber(summary().cancelled)} cancelled / ${formatNumber(summary().resolved)} resolved`}
                comparison={comparison(cancellationRate(), previousCancellationRate(), true)}
                Icon={RotateCcw}
              />
            </section>

            <section aria-label="Marketplace activity trend" class="mt-5 rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
              <ChartHeading eyebrow="01 · Marketplace demand" title="Orders & bookings over time" description="Creation activity · click a day to inspect it" />
              <Show when={trendPoints().some((point) => point.orders + point.bookings > 0)} fallback={<ChartEmptyState text="No activity in this reporting window." />}>
                <ActivityTrendChart points={trendPoints} onSelectDay={setSelectedDay} />
              </Show>
            </section>

            <section aria-label="Confirmed M-PESA payments" class="mt-5 rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
              <ChartHeading eyebrow="02 · Confirmed payments" title="Paid M-PESA over time" description="Successful payment totals by payment creation date · KES · record filters do not apply" />
              <Show when={paymentTrendPoints().some((point) => Number(point.amount ?? 0) > 0)} fallback={<ChartEmptyState text="No confirmed M-PESA payments in this reporting window." />}>
                <PaymentTrendChart points={paymentTrendPoints} />
              </Show>
            </section>

            <section aria-label="Lifecycle status comparison" class="mt-5 rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
              <ChartHeading eyebrow="03 · Current lifecycle" title="Status comparison" description="Click a segment to filter every panel by that current status" />
              <Show when={Number(summary().orders) + Number(summary().bookings) > 0} fallback={<ChartEmptyState text="No lifecycle statuses to compare." />}>
                <StatusComparisonChart snapshot={snapshot} onSelectStatus={setStatus} />
              </Show>
            </section>

            <section class="mt-5 grid gap-5 xl:grid-cols-2">
              <article aria-label="Product demand leaderboard" class="rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
                <ChartHeading eyebrow="03 · Product demand" title="Most requested products" description="Top ten by record count · order and booking counts compared" />
                <Show when={snapshot().products.length > 0} fallback={<ChartEmptyState text="No product demand matches these filters." />}>
                  <ProductDemandChart products={productOptions} onSelectProduct={setProductId} />
                </Show>
              </article>
            </section>

            <section class="mt-5 grid gap-5 xl:grid-cols-2">
              <article aria-label="Operational pressure by record age" class="rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
                <ChartHeading eyebrow="05 · Operational pressure" title="Open record age" description="Pending + ongoing records grouped by age since creation, not status duration" />
                <Show when={workloadTotal() > 0} fallback={<ChartEmptyState text="No pending or ongoing records in this view." />}>
                  <WorkloadAgeChart workload={() => snapshot().workload} />
                </Show>
              </article>
              <article aria-label="Customer repeat activity" class="rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
                <ChartHeading eyebrow="06 · Customer activity" title="First-time & returning" description="Returning means at least two qualifying records in this selected period" />
                <Show when={summary().customers > 0} fallback={<ChartEmptyState text="No distinct customers in this view." />}>
                  <CustomerRepeatChart summary={summary} />
                </Show>
              </article>
            </section>

            <RecentActivityTable records={() => snapshot().recent} />
        </Show>
      </div>
    </main>
  );
}

function ChartHeading(props) {
  return (
    <div class="mb-3">
      <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-hunter-green-500">{props.eyebrow}</p>
      <h2 class="mt-1 font-serif text-xl text-dust-grey-100">{props.title}</h2>
      <p class="mt-1 text-xs leading-5 text-dust-grey-text">{props.description}</p>
    </div>
  );
}

function ChartEmptyState(props) {
  return (
    <p class="flex h-64 items-center justify-center rounded-xl border border-dashed border-dust-grey-600 px-4 text-center text-sm text-dust-grey-text">
      {props.text}
    </p>
  );
}
