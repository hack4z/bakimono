import { A, useParams } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { ArrowLeft, LockKeyhole, PackageSearch } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import { supabase } from "~/utils/supabase";
import { getProductImageUrl } from "~/utils/product-images";

function formatPrice(price) {
  const amount = Number(price);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
    : "$0.00";
}

export default function CheckoutPage() {
  const params = useParams();
  const [product, setProduct] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");

  async function loadProduct() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select("product_id, name, description, price, type, cover_image, images, capacity, quantity")
        .eq("product_id", params.productId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("This product could not be found.");
      setProduct(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load this product right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  onMount(loadProduct);

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="/explore"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to explore
        </A>

        <div class="mt-7">
          <BrandBanner
            eyebrow="Your next good thing"
            title="Checkout."
            description="Review your selection before continuing."
          />
        </div>

        <Show when={isLoading()}>
          <div role="status" class="mt-6 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-12 text-center text-sm text-dust-grey-300">
            Loading checkout…
          </div>
        </Show>

        <Show when={!isLoading() && errorMessage()}>
          <div role="alert" class="mt-6 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
            <h2 class="font-serif text-xl text-dust-grey-100">Unable to continue</h2>
            <p class="mt-2 text-sm text-dust-grey-300">{errorMessage()}</p>
            <A href="/explore" class="mt-4 inline-block text-sm font-semibold text-hunter-green-500 hover:underline">
              Return to explore
            </A>
          </div>
        </Show>

        <Show when={!isLoading() && product()}>
          {(item) => (
            <section class="mt-6 grid overflow-hidden rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 shadow-sm md:grid-cols-[0.9fr_1.1fr]">
              <div class="relative min-h-64 bg-dry-sage-900 md:min-h-[390px]">
                <Show
                  when={getProductImageUrl(item())}
                  fallback={
                    <div class="flex size-full min-h-64 items-center justify-center bg-gradient-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                      <PackageSearch size={44} strokeWidth={1.3} class="text-dry-sage-300" aria-hidden="true" />
                    </div>
                  }
                >
                  {(image) => (
                    <img
                      src={image()}
                      alt={item().name}
                      class="absolute inset-0 size-full object-cover"
                    />
                  )}
                </Show>
              </div>

              <div class="p-5 sm:p-8">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">
                  Order summary
                </p>
                <h2 class="mt-2 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100">
                  {item().name || "Untitled product"}
                </h2>
                <Show when={item().type}>
                  <p class="mt-1 text-sm capitalize text-dust-grey-300">{item().type}</p>
                </Show>
                <Show when={item().capacity}>
                  <p class="mt-3 text-sm text-dust-grey-200">{item().capacity}</p>
                </Show>
                <Show when={item().description}>
                  <p class="mt-4 line-clamp-4 text-sm leading-6 text-dust-grey-200">
                    {item().description}
                  </p>
                </Show>

                <div class="mt-7 flex items-center justify-between border-t border-dust-grey-700 pt-4">
                  <span class="text-sm text-dust-grey-300">Item total</span>
                  <span class="text-lg font-semibold text-hunter-green-500">
                    {formatPrice(item().price)}
                  </span>
                </div>
                <p class="mt-2 text-xs text-dust-grey-300">
                  {Number(item().quantity) > 0
                    ? `${item().quantity} available`
                    : "Currently unavailable"}
                </p>

                <div class="mt-6 rounded-2xl border border-dry-sage-700 bg-dry-sage-900 p-4">
                  <p class="flex items-center gap-2 text-sm font-semibold text-dust-grey-100">
                    <LockKeyhole size={16} class="text-hunter-green-500" aria-hidden="true" />
                    Secure payment is not set up yet
                  </p>
                  <p class="mt-2 text-xs leading-5 text-dust-grey-300">
                    Checkout is ready for review, but online payment processing has not been connected.
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  class="mt-5 h-12 w-full cursor-not-allowed rounded-xl bg-hunter-green-500 text-sm font-semibold text-white opacity-50"
                >
                  Continue to payment
                </button>
              </div>
            </section>
          )}
        </Show>
      </div>
    </main>
  );
}
