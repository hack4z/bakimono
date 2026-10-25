import { A } from "@solidjs/router";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  Store,
} from "lucide-solid";

const providerFeatures = [
  {
    eyebrow: "See the bigger picture",
    title: "Analytics that help you understand your business.",
    description:
      "Get a clearer view of how people discover and engage with your offerings. Bring useful performance signals together so you can spot trends, understand what is working, and make more informed decisions about what to do next.",
    image: "photo-1460925895917-afdab827c52f",
    imageAlt: "A workspace with business charts on a computer",
    Icon: BarChart3,
    action: "Understand your performance",
  },
  {
    eyebrow: "Stay in control",
    title: "A booking system built around your reservations.",
    description:
      "Keep booking activity organized in one place. Review reservation details, follow their status, and keep track of the plans your customers have made, helping you stay prepared and provide a more considered experience.",
    image: "photo-1556742049-0cfed4f6a45d",
    imageAlt: "A business owner using a tablet at a counter",
    Icon: CalendarCheck,
    action: "Keep bookings organized",
  },
  {
    eyebrow: "Payments, more simply",
    title: "A payment system for a smoother customer journey.",
    description:
      "Give customers a clear way to complete payment as part of their booking or order. Keep payment information connected to the customer journey, making it easier to follow transaction status and stay on top of the details.",
    image: "photo-1556740758-90de374c12ad",
    imageAlt: "A customer completing a card payment",
    Icon: CreditCard,
    action: "Make payments easier",
  },
  {
    eyebrow: "Guidance when it matters",
    title: "Policy care to help keep expectations clear.",
    description:
      "Policies shape the experience for both you and your customers. Bakimono helps you give them thoughtful attention, so important details are easier to communicate and customers know what to expect before they book.",
    image: "photo-1450101499163-c8848c66ca85",
    imageAlt: "A provider reviewing business documents",
    Icon: FileCheck2,
    action: "Put policies in good shape",
  },
];

const imageUrl = (photo) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1400&q=85`;

export default function ProviderPage() {
  return (
    <main class="min-h-screen bg-dust-grey-900 text-dust-grey-100">
      <section class="mx-auto grid min-h-[560px] max-w-[1440px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-16">
        <div class="max-w-xl">
          <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-dry-sage-800 bg-dry-sage-900 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-hunter-green-500">
            <Store size={14} aria-hidden="true" />
            THE PROVIDER SPACE
          </div>
          <h1 class="font-serif text-5xl leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-[66px]">
            Great places deserve <span class="text-hunter-green-500">great tools.</span>
          </h1>
          <p class="mt-6 max-w-lg text-base leading-7 text-dust-grey-200 sm:text-lg">
            Bring your business to Bakimono. Find tools for understanding performance,
            managing bookings, handling payments, and caring for your policies.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <A
              href="/provider/signup"
              class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              Join as a provider <ArrowUpRight size={16} aria-hidden="true" />
            </A>
            <A
              href="/login"
              class="inline-flex h-12 items-center justify-center rounded-full border border-dust-grey-600 px-6 text-sm font-semibold text-dust-grey-100 transition hover:border-fern-500 hover:text-hunter-green-500"
            >
              Provider sign in
            </A>
          </div>
          <a href="#provider-tools" class="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
            See what you can do <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>

        <div class="relative min-h-[340px] overflow-hidden rounded-[32px] bg-dry-sage-800 sm:min-h-[460px]">
          <img
            src={imageUrl("photo-1556761175-b413da4baf72")}
            alt="A small business team planning their next steps"
            class="absolute inset-0 size-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-pine-teal-100/85 via-pine-teal-100/15 to-transparent" />
          <img
            src="/logo_pack/emblem-multicolor-on-dark.svg"
            alt=""
            class="absolute right-5 top-5 size-12 drop-shadow-lg sm:right-7 sm:top-7 sm:size-14"
          />
          <div class="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-white/90 p-4 backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-fern-500">A better way to grow</p>
            <p class="mt-1 font-serif text-2xl tracking-[-0.03em] text-dust-grey-100 sm:text-3xl">
              Spend more time on what you do best.
            </p>
          </div>
        </div>
      </section>

      <section id="provider-tools" class="border-y border-dust-grey-700 bg-dust-grey-800">
        <div class="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">Your business, supported</p>
          <h2 class="mt-2 max-w-2xl font-serif text-3xl tracking-[-0.04em] sm:text-4xl">
            The essentials to help you run things with confidence.
          </h2>
          <p class="mt-4 max-w-2xl text-sm leading-6 text-dust-grey-200 sm:text-base">
            From first impressions to the details behind each reservation, explore the ways Bakimono can support your work.
          </p>
        </div>
      </section>

      {providerFeatures.map(({ eyebrow, title, description, image, imageAlt, Icon, action }, index) => (
        <section
          aria-labelledby={`provider-feature-${index}`}
          class={index % 2 === 0 ? "border-b border-dust-grey-700 bg-dust-grey-900" : "border-b border-dust-grey-700 bg-dust-grey-800"}
        >
          <div class="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:px-12 lg:py-16">
            <div class={index % 2 === 1 ? "relative min-h-[260px] overflow-hidden rounded-[28px] bg-dry-sage-800 lg:order-2 lg:min-h-[360px]" : "relative min-h-[260px] overflow-hidden rounded-[28px] bg-dry-sage-800 lg:min-h-[360px]"}>
              <img src={imageUrl(image)} alt={imageAlt} loading="lazy" class="absolute inset-0 size-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-pine-teal-100/45 to-transparent" />
              <span class="absolute bottom-4 left-4 flex size-12 items-center justify-center rounded-2xl border border-white/40 bg-white/90 text-hunter-green-500 backdrop-blur-sm">
                <Icon size={22} aria-hidden="true" />
              </span>
            </div>
            <div class={index % 2 === 1 ? "lg:order-1" : ""}>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">{eyebrow}</p>
              <h2 id={`provider-feature-${index}`} class="mt-3 max-w-xl font-serif text-3xl leading-tight tracking-[-0.04em] text-dust-grey-100 sm:text-4xl">
                {title}
              </h2>
              <p class="mt-4 max-w-xl text-sm leading-7 text-dust-grey-200 sm:text-base">
                {description}
              </p>
              <a href="/provider/signup" class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 hover:underline">
                {action} <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      ))}

      <section class="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div class="relative isolate overflow-hidden rounded-[30px] bg-hunter-green-500 px-6 py-9 sm:px-10 sm:py-12">
          <div class="pointer-events-none absolute -right-8 -top-12 opacity-20">
            <img src="/logo_pack/emblem-on-dark.svg" alt="" class="size-48" />
          </div>
          <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="max-w-2xl">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Start your next chapter</p>
              <h2 class="mt-2 font-serif text-3xl tracking-[-0.04em] text-white sm:text-4xl">
                Let’s grow something good together.
              </h2>
              <p class="mt-3 text-sm leading-6 text-white/85 sm:text-base">
                Join Bakimono as a provider or sign in to continue to your account.
              </p>
            </div>
            <div class="relative flex shrink-0 flex-wrap gap-3">
              <A
                href="/provider/signup"
                class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-dry-sage-900 px-6 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-800"
              >
                Join Bakimono <ArrowUpRight size={15} aria-hidden="true" />
              </A>
              <A
                href="/login"
                class="inline-flex h-12 items-center justify-center rounded-full border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </A>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
