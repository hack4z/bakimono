export default function LoadingState(props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      class={`rounded-2xl border border-dust-grey-600 bg-dust-grey-900 p-5 ${props.class ?? ""}`}
    >
      <div class="flex items-center gap-3">
        <span class="size-5 animate-spin rounded-full border-2 border-dry-sage-700 border-t-hunter-green-500" />
        <span class="text-sm text-dust-grey-text">{props.label ?? "Loading…"}</span>
      </div>
      <div class="mt-4 space-y-2" aria-hidden="true">
        <span class="block h-3 w-3/4 animate-pulse rounded-full bg-dust-grey-700" />
        <span class="block h-3 w-1/2 animate-pulse rounded-full bg-dust-grey-700" />
      </div>
    </div>
  );
}
