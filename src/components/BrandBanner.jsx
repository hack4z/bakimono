export default function BrandBanner(props) {
  return (
    <section class="relative mb-7 overflow-hidden rounded-[28px] border border-hunter-green-400 bg-gradient-to-br from-hunter-green-500 via-pine-teal-500 to-fern-500 p-5 text-white shadow-sm sm:p-7 lg:p-8">
      <div class="pointer-events-none absolute -right-12 -top-20 size-56 rounded-full border border-white/15" />
      <div class="pointer-events-none absolute -bottom-32 right-28 size-64 rounded-full border border-white/10" />
      <div class="relative flex flex-wrap items-center justify-between gap-5">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
            {props.eyebrow}
          </p>
          <h1 class="mt-1 font-serif text-3xl tracking-[-0.04em] text-white sm:text-[38px]">
            {props.title}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-white/80">
            {props.description}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-4">
          {props.children}
          <img
            src="/logo_pack/logo-horizontal-on-dark.svg"
            alt="Bakimono"
            class="h-7 w-auto opacity-90 sm:h-10"
          />
        </div>
      </div>
    </section>
  );
}
