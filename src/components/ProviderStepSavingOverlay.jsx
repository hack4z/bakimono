export default function ProviderStepSavingOverlay(props) {
  return (
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-dust-grey-900/95 px-5 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="w-full max-w-sm text-center">
        <div class="relative mx-auto size-20">
          <span class="absolute inset-0 animate-spin rounded-full border-2 border-dry-sage-700 border-t-hunter-green-500 border-r-fern-500 motion-reduce:animate-none" />
          <span class="absolute inset-4 flex items-center justify-center rounded-full bg-dry-sage-900">
            <span class="size-2.5 animate-pulse rounded-full bg-hunter-green-500 motion-reduce:animate-none" />
          </span>
        </div>
        <p class="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-fern-text">
          Please wait
        </p>
        <h2 class="mt-2 font-serif text-2xl tracking-tight">
          {props.label ?? "Saving your details"}
        </h2>
      </div>
    </div>
  );
}
