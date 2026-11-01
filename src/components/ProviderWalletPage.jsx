import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { AlertCircle, Check, RefreshCw, Store, Wallet } from "lucide-solid";
import AnalyticsChart from "~/components/AnalyticsChart";
import LoadingState from "~/components/LoadingState";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { supabase } from "~/utils/supabase-client";
import { getCurrentProvider, getProviderProducts } from "~/utils/provider-data";

const ranges = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function formatKes(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function buildEarnings(rows, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, label: dateLabel(date), amount: 0 };
  });
  const indexByDay = new Map(points.map((point, index) => [
    `${point.date.getFullYear()}-${point.date.getMonth()}-${point.date.getDate()}`,
    index,
  ]));
  for (const row of rows) {
    const date = new Date(row.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const index = indexByDay.get(key);
    if (index != null) points[index].amount += Number(row.amount);
  }
  return points;
}

function earningsOption(theme, points) {
  return {
    aria: { enabled: true },
    animationDuration: 500,
    color: [theme.primary],
    textStyle: { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" },
    tooltip: {
      trigger: "axis",
      backgroundColor: theme.surface,
      borderColor: theme.grid,
      borderWidth: 1,
      textStyle: { color: theme.text },
      extraCssText: "border-radius: 12px; box-shadow: 0 12px 35px rgb(0 0 0 / 0.18);",
      formatter: (items) => {
        const point = points[items[0]?.dataIndex];
        return point ? `<strong>${point.label}</strong><br/>Paid M-PESA: ${formatKes(point.amount)}` : "";
      },
    },
    grid: { top: 24, left: 18, right: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: points.map((point) => point.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.muted, hideOverlap: true, interval: Math.max(0, Math.floor(points.length / 7) - 1) },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: { color: theme.muted, formatter: (value) => value === 0 ? "0" : `${Math.round(value / 1000)}k` },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.grid, type: "dashed", opacity: 0.7 } },
    },
    series: [{
      name: "Paid M-PESA",
      type: "line",
      smooth: 0.32,
      showSymbol: false,
      symbolSize: 7,
      lineStyle: { width: 3, shadowBlur: 12, shadowColor: theme.primary },
      areaStyle: { opacity: 0.18 },
      emphasis: { focus: "series", showSymbol: true },
      data: points.map((point) => point.amount),
    }],
  };
}

export default function ProviderWalletPage() {
  const [range, setRange] = createSignal(30);
  const [providerId, setProviderId] = createSignal("");
  const [mpesaCodeType, setMpesaCodeType] = createSignal("till_number");
  const [tillNumber, setTillNumber] = createSignal("");
  const [earnings, setEarnings] = createSignal([]);
  const [earningsLoading, setEarningsLoading] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [savingTill, setSavingTill] = createSignal(false);
  const [successMessage, setSuccessMessage] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [tillError, setTillError] = createSignal("");
  const [earningsError, setEarningsError] = createSignal("");
  let earningsRequest = 0;

  async function loadEarnings(productIds, days) {
    const request = ++earningsRequest;
    setEarningsLoading(true);
    setEarningsError("");
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - days + 1);
      const rows = [];
      const paidStatuses = ["paid", "completed", "complete", "successful", "success"];
      for (let offset = 0; offset < productIds.length; offset += 100) {
        const ids = productIds.slice(offset, offset + 100);
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from("transactions")
            .select("created_at, amount")
            .in("product_id", ids)
            .in("status", paidStatuses)
            .gte("created_at", start.toISOString())
            .lt("created_at", end.toISOString())
            .order("created_at", { ascending: true })
            .range(from, from + 999);
          if (error) throw error;
          rows.push(...(data ?? []));
          if ((data ?? []).length < 1000) break;
        }
      }
      if (request === earningsRequest) setEarnings(buildEarnings(rows, days));
    } finally {
      if (request === earningsRequest) setEarningsLoading(false);
    }
  }

  async function loadWallet(days = range()) {
    setLoading(true);
    setErrorMessage("");
    try {
      const { providerId: currentProviderId } = await getCurrentProvider();
      setProviderId(currentProviderId);
      const products = await getProviderProducts(currentProviderId);
      const { data, error } = await supabase
        .from("providers")
        .select("mpesa_code_type, mpesa_code")
        .eq("provider_id", currentProviderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("The provider profile is not available to this account.");
      setTillNumber(data.mpesa_code ?? "");
      setMpesaCodeType(data.mpesa_code_type ?? "till_number");
      await loadEarnings(products.map((product) => product.product_id), days).catch((error) => {
        setEarningsError(error instanceof Error ? error.message : "Unable to load confirmed payments.");
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider wallet data.");
    } finally {
      setLoading(false);
    }
  }

  onMount(() => void loadWallet());

  const totalEarnings = createMemo(() => earnings().reduce((total, point) => total + point.amount, 0));
  const averageDaily = createMemo(() => earnings().length ? totalEarnings() / earnings().length : 0);

  async function saveTill(event) {
    event.preventDefault();
    if (savingTill()) return;
    setTillError("");
    setSuccessMessage("");
    const till = tillNumber().trim();
    if (!/^\d+$/.test(till)) {
      setTillError(`Enter your M-PESA ${mpesaCodeType() === "phone_number" ? "phone number" : mpesaCodeType() === "paybill" ? "Paybill number" : "Till number"} using digits only.`);
      return;
    }

    setSavingTill(true);
    try {
      const { data, error } = await supabase
        .from("providers")
        .update({ mpesa_code_type: mpesaCodeType(), mpesa_code: till, updated_at: new Date().toISOString() })
        .eq("provider_id", providerId())
        .select("provider_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("The Till number was not updated. Check provider update permissions.");
      setSuccessMessage("M-PESA Till number updated.");
    } catch (error) {
      setTillError(error instanceof Error ? error.message : "Unable to save the M-PESA Till number.");
    } finally {
      setSavingTill(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-12 pt-7 text-dust-grey-100 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-300">
        <ProviderSignupBanner />
        <header class="relative overflow-hidden rounded-7 border border-hunter-green-400 bg-linear-to-br from-hunter-green-500 via-pine-teal-500 to-fern-500 p-5 text-white shadow-sm sm:p-7 lg:p-8">
          <div aria-hidden="true" class="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-white/15" />
          <div class="relative">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Provider finances</p>
            <h1 class="mt-1 font-serif text-3xl tracking-[-0.04em] sm:text-[38px]">Wallet</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-white/85">Review confirmed M-PESA payments and manage where your business receives payments.</p>
          </div>
        </header>

        <section aria-label="Earnings overview" class="mt-6 overflow-hidden rounded-7 border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-7">
          <div class="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-hunter-green-500">Confirmed earnings · KES</p>
              <h2 class="mt-2 font-serif text-2xl sm:text-3xl">{formatKes(totalEarnings())}</h2>
              <p class="mt-1 text-sm text-dust-grey-text">Successful M-PESA payments in the selected period</p>
            </div>
            <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
              <span>Period</span>
              <select
                aria-label="Earnings chart period"
                value={range()}
                onChange={(event) => {
                  const days = Number(event.currentTarget.value);
                  setRange(days);
                  if (providerId()) void loadEarnings(providerId(), days).catch((error) => {
                    setEarningsError(error instanceof Error ? error.message : "Unable to load confirmed payments.");
                  });
                }}
                class="h-10 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-hunter-green-500"
              >
                <For each={ranges}>{(item) => <option value={item.value}>Last {item.label}</option>}</For>
              </select>
            </label>
          </div>
          <Show when={earningsLoading() && !loading()}>
            <p role="status" class="mt-4 text-xs text-dust-grey-text">Updating earnings…</p>
          </Show>
          <Show when={loading()}>
            <LoadingState class="mt-5" label="Loading earnings…" />
          </Show>
          <Show when={earningsError()}>
            <p role="alert" class="mt-4 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{earningsError()}</p>
          </Show>
          <Show when={!loading() && !earningsLoading() && !earningsError()}>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-dust-grey-600 bg-dust-grey-900/60 p-4">
                <p class="text-xs text-dust-grey-text">Total confirmed payments</p>
                <p class="mt-1 text-lg font-semibold tabular-nums">{formatKes(totalEarnings())}</p>
              </div>
              <div class="rounded-2xl border border-dust-grey-600 bg-dust-grey-900/60 p-4">
                <p class="text-xs text-dust-grey-text">Average per day</p>
                <p class="mt-1 text-lg font-semibold tabular-nums">{formatKes(averageDaily())}</p>
              </div>
            </div>
            <Show when={totalEarnings() > 0} fallback={<p class="mt-5 rounded-xl border border-dashed border-dust-grey-600 px-4 py-10 text-center text-sm text-dust-grey-text">No confirmed M-PESA payments in this period.</p>}>
              <AnalyticsChart
                label={`Confirmed M-PESA earnings for the last ${range()} days in Kenyan shillings`}
                getOption={(theme) => earningsOption(theme, earnings())}
                class="mt-5 h-[380px] w-full sm:h-[460px]"
              />
            </Show>
          </Show>
          <p class="mt-2 text-xs leading-5 text-dust-grey-400">Chart uses successful payment transactions. Dates use your local timezone.</p>
        </section>

        <section aria-labelledby="mpesa-heading" class="mt-6 rounded-7 border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-7">
          <div class="flex items-start gap-3">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-hunter-green-500/10 text-hunter-green-500"><Wallet size={20} aria-hidden="true" /></span>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-hunter-green-500">Payout details</p>
              <h2 id="mpesa-heading" class="mt-1 font-serif text-2xl">M-PESA payment details</h2>
              <p class="mt-1 text-sm leading-6 text-dust-grey-text">Choose the type of M-PESA code your business uses, then enter the number.</p>
            </div>
          </div>
          <Show when={loading()}><LoadingState class="mt-5" label="Loading M-PESA details…" /></Show>
          <Show when={!loading() && errorMessage()}>
            <p role="alert" class="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertCircle size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1">{errorMessage()}</span>
              <button type="button" onClick={() => void loadWallet()} class="shrink-0 font-semibold underline">Try again</button>
            </p>
          </Show>
          <Show when={!loading() && !errorMessage()}>
            <form class="mt-5" onSubmit={saveTill}>
              <label class="block max-w-xl text-sm font-medium text-dust-grey-200">
                M-PESA code type
                <select
                  value={mpesaCodeType()}
                  onChange={(event) => {
                    setMpesaCodeType(event.currentTarget.value);
                    setSuccessMessage("");
                    setTillError("");
                  }}
                  class="mt-2 h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none focus:border-hunter-green-500 focus:ring-2 focus:ring-hunter-green-500/15"
                >
                  <option value="phone_number">Phone number</option>
                  <option value="till_number">Till number</option>
                  <option value="paybill">Paybill</option>
                </select>
              </label>
              <label class="block max-w-xl text-sm font-medium text-dust-grey-200">
                {mpesaCodeType() === "phone_number" ? "M-PESA phone number" : mpesaCodeType() === "paybill" ? "Paybill number" : "Business Till number"}
                <span class="mt-2 flex h-12 items-center gap-3 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 focus-within:border-hunter-green-500 focus-within:ring-2 focus-within:ring-hunter-green-500/15">
                  <Store size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
                  <input type="text" inputmode="numeric" autocomplete="off" maxlength="20" value={tillNumber()} onInput={(event) => { setTillNumber(event.currentTarget.value); setSuccessMessage(""); setTillError(""); }} placeholder="Enter your Till number" class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-400" />
                </span>
                <span class="mt-1.5 block text-xs text-dust-grey-400">Digits only. This is where your business payments will be directed.</span>
              </label>
              <Show when={tillError()}>
                <p role="alert" class="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle size={16} class="mt-0.5 shrink-0" aria-hidden="true" /> {tillError()}</p>
              </Show>
              <Show when={successMessage()}>
                <p role="status" class="mt-4 flex items-center gap-2 rounded-xl border border-fern-500/30 bg-fern-500/10 px-4 py-3 text-sm text-dust-grey-100"><Check size={16} class="shrink-0 text-fern-text" aria-hidden="true" /> {successMessage()}</p>
              </Show>
              <button type="submit" disabled={savingTill()} class="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60">
                <RefreshCw size={15} class={savingTill() ? "animate-spin" : ""} aria-hidden="true" /> {savingTill() ? "Saving…" : "Save M-PESA details"}
              </button>
            </form>
          </Show>
        </section>
      </div>
    </main>
  );
}
