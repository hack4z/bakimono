import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

let echartsRuntimePromise;

function loadEchartsRuntime() {
  if (!echartsRuntimePromise) {
    echartsRuntimePromise = Promise.all([
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/core"),
      import("echarts/renderers"),
    ]).then(([charts, components, core, renderers]) => {
      core.use([
        charts.BarChart,
        charts.LineChart,
        charts.PieChart,
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        components.AriaComponent,
        renderers.CanvasRenderer,
      ]);
      return core;
    }).catch((error) => {
      echartsRuntimePromise = undefined;
      throw error;
    });
  }
  return echartsRuntimePromise;
}

export default function AnalyticsChart(props) {
  let element;
  const [chart, setChart] = createSignal();
  const [themeVersion, setThemeVersion] = createSignal(0);
  const [chartError, setChartError] = createSignal("");

  onMount(() => {
    let disposed = false;
    let instance;
    let resizeObserver;
    let handleChartClick;
    const syncTheme = () => setThemeVersion((version) => version + 1);
    window.addEventListener("bakimono-theme-change", syncTheme);
    const loadChart = async () => {
      try {
        const core = await loadEchartsRuntime();
        if (disposed) return;
        instance = core.init(element);
        handleChartClick = props.onChartClick;
        if (handleChartClick) instance.on("click", handleChartClick);
        resizeObserver = new ResizeObserver(() => instance.resize());
        resizeObserver.observe(element);
        setChart(instance);
      } catch (error) {
        if (!disposed) {
          setChartError(error instanceof Error ? error.message : "Unable to load the analytics chart.");
        }
      }
    };
    void loadChart();

    onCleanup(() => {
      disposed = true;
      resizeObserver?.disconnect();
      window.removeEventListener("bakimono-theme-change", syncTheme);
      if (instance && handleChartClick) instance.off("click", handleChartClick);
      instance?.dispose();
    });
  });

  createEffect(() => {
    const instance = chart();
    const version = themeVersion();
    if (!instance) return;

    const styles = getComputedStyle(element);
    const themePalette = {
      text: styles.getPropertyValue("--color-dust-grey-200").trim(),
      muted: styles.getPropertyValue("--color-dust-grey-300").trim(),
      grid: styles.getPropertyValue("--color-dust-grey-700").trim(),
      surface: styles.getPropertyValue("--color-dry-sage-900").trim(),
      primary: styles.getPropertyValue("--color-hunter-green-500").trim(),
      secondary: styles.getPropertyValue("--color-pine-teal-500").trim(),
      success: styles.getPropertyValue("--color-fern-500").trim(),
      warning: "#d99b25",
      danger: "#d46a68",
      statusCheckout: styles.getPropertyValue("--color-dust-grey-400").trim(),
      statusColors: {
        checkout: styles.getPropertyValue("--color-dust-grey-400").trim(),
        pending: styles.getPropertyValue("--color-pine-teal-500").trim(),
        ongoing: styles.getPropertyValue("--color-fern-500").trim(),
        completed: styles.getPropertyValue("--color-hunter-green-500").trim(),
        cancelled: styles.getPropertyValue("--color-rose-500").trim() || "#d46a68",
      },
      version,
    };

    instance.setOption(props.getOption(themePalette), true);
  });

  return (
    <>
      <div
        ref={element}
        role="img"

        class={props.class}
        style={props.style}
      >
        <Show when={props.centerValue != null}>
          <div class="pointer-events-none absolute left-1/2 top-[46%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
            <p class="text-2xl font-semibold tracking-tight text-dust-grey-100">{props.centerValue}</p>
            <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-dust-grey-text">{props.centerLabel}</p>
          </div>
        </Show>
      </div>
      <Show when={chartError()}>
        <p role="alert" class="mt-2 text-xs text-rose-700">Unable to render chart: {chartError()}</p>
      </Show>
    </>
  );
}
