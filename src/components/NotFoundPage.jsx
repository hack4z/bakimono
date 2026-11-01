import { A } from "@solidjs/router";
import { Compass } from "lucide-solid";

export default function NotFoundPage() {
  return (
    <main class="flex min-h-screen items-center justify-center bg-dust-grey-800 px-5 py-16 text-dust-grey-100">
      <section class="w-full max-w-lg text-center">
        <div class="mx-auto flex size-20 items-center justify-center rounded-[1.75rem] border border-dust-grey-600 bg-dust-grey-900 shadow-sm">
          <Compass size={36} strokeWidth={1.5} class="text-hunter-green-500" aria-hidden="true" />
        </div>
        <p class="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-fern-text">
          Error 404
        </p>
        <h1 class="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-dust-grey-text sm:text-base">
          This destination is not available. Return home to keep exploring Bakimono.
        </p>
        <A
          href="/"
          class="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-hunter-green-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
        >
          Back to home
        </A>
      </section>
    </main>
  );
}
