import { A } from "@solidjs/router";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bookmark,
  CalendarCheck,
  Compass,
  CreditCard,
  FileCheck2,
  Sparkles,
  Store,
  UserRound,
  Utensils,
} from "lucide-solid";

const experiences = [
  {
    title: "A place to stay",
    description: "Find somewhere welcoming for your next getaway.",
    image: "photo-1611892440504-42a792e24d32",
    Icon: BedDouble,
  },
  {
    title: "A table to share",
    description: "Discover a spot for a slow meal or a special occasion.",
    image: "photo-1414235077428-338989a2e8c0",
    Icon: Utensils,
  },
  {
    title: "An experience to remember",
    description: "Make room in your plans for something new.",
    image: "photo-1517248135467-4c7edcad34c4",
    Icon: Sparkles,
  },
];

const userFeatures = [
  {
    title: "Discover stays and dining",
    description: "Browse available products and find something that suits your plans.",
    href: "/explore",
    Icon: Compass,
  },
  {
    title: "Save your favourites",
    description: "Bookmark products and revisit them from your dashboard.",
    href: "/dashboard",
    Icon: Bookmark,
  },
  {
    title: "Keep track of plans",
    description: "View your bookings and orders together in one place.",
    href: "/bookings",
    Icon: CalendarCheck,
  },
  {
    title: "Manage your profile",
    description: "Update your personal details and account preferences.",
    href: "/settings",
    Icon: UserRound,
  },
];

const providerFeatures = [
  {
    title: "Analytics",
    description: "Understand how your offerings are performing with useful business insights.",
    Icon: BarChart3,
  },
  {
    title: "Booking systems",
    description: "Manage reservations and keep your bookings organized in one place.",
    Icon: CalendarCheck,
  },
  {
    title: "Payments",
    description: "Accept and manage payments through the Bakimono provider experience.",
    Icon: CreditCard,
  },
  {
    title: "Policy care",
    description: "Get help keeping your business policies clear and up to date.",
    Icon: FileCheck2,
  },
];

const imageUrl = (photo) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1400&q=85`;

export default function HomePage() {
  return (
    <main class="bg-dust-grey-900 text-dust-grey-100">
      <section class="mx-auto grid min-h-[620px] max-w-[1440px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-16">
        <div class="max-w-xl">
          <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-dry-sage-800 bg-dry-sage-900 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-hunter-green-500">
            <Sparkles size={14} aria-hidden="true" />
            LITTLE PLANS, LOVELY PLACES
          </div>
          <h1 class="font-serif text-5xl leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-[68px]">
            Make room for <span class="text-hunter-green-500">good moments.</span>
          </h1>
          <p class="mt-6 max-w-lg text-base leading-7 text-dust-grey-200 sm:text-lg">
            Find a place to stay, a table to linger at, or an experience worth
            looking forward to. Your next good moment starts with Bakimono.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <A
              href="/signup"
              class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              Join Bakimono <ArrowUpRight size={16} aria-hidden="true" />
            </A>
            <A
              href="/login"
              class="inline-flex h-12 items-center justify-center rounded-full border border-dust-grey-600 px-6 text-sm font-semibold text-dust-grey-100 transition hover:border-fern-500 hover:text-hunter-green-500"
            >
              Sign in
            </A>
          </div>
          <A href="/explore" class="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
            Explore what’s waiting <ArrowRight size={15} aria-hidden="true" />
          </A>
        </div>

        <div class="relative min-h-[340px] overflow-hidden rounded-[32px] bg-dry-sage-800 sm:min-h-[460px]">
          <img
            src={imageUrl("photo-1517248135467-4c7edcad34c4")}
            alt="A warmly lit restaurant ready to welcome guests"
            class="absolute inset-0 size-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-pine-teal-100/80 via-pine-teal-100/10 to-transparent" />
          <img
            src="/logo_pack/emblem-multicolor-on-dark.svg"
            alt=""
            class="absolute right-5 top-5 size-12 drop-shadow-lg sm:right-7 sm:top-7 sm:size-14"
          />
          <div class="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-white/90 p-4 backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-fern-500">Stay · dine · unwind</p>
            <p class="mt-1 font-serif text-2xl tracking-[-0.03em] text-dust-grey-100 sm:text-3xl">
              Your kind of day, made easy.
            </p>
          </div>
        </div>
      </section>

      <section class="border-y border-dust-grey-700 bg-dust-grey-800">
        <div class="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div class="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">Find your next favorite</p>
              <h2 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">A little something for every plan.</h2>
            </div>
            <A href="/explore" class="inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
              Explore Bakimono <ArrowRight size={15} aria-hidden="true" />
            </A>
          </div>

          <div class="mt-8 grid gap-5 md:grid-cols-3">
            {experiences.map(({ title, description, image, Icon }) => (
              <A
                href="/explore"
                class="group overflow-hidden rounded-[24px] border border-dust-grey-600 bg-dust-grey-900 transition hover:-translate-y-1 hover:border-dry-sage-500 hover:shadow-xl"
              >
                <div class="relative aspect-[1.5] overflow-hidden bg-dry-sage-900">
                  <img
                    src={imageUrl(image)}
                    alt=""
                    loading="lazy"
                    class="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span class="absolute bottom-3 left-3 flex size-10 items-center justify-center rounded-xl bg-white/95 text-hunter-green-500">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                </div>
                <div class="p-5">
                  <h3 class="font-serif text-xl text-dust-grey-100">{title}</h3>
                  <p class="mt-2 text-sm leading-6 text-dust-grey-300">{description}</p>
                </div>
              </A>
            ))}
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div class="relative overflow-hidden rounded-[30px] bg-hunter-green-500 px-6 py-10 sm:px-10 sm:py-12">
          <div class="pointer-events-none absolute -right-8 -top-12 opacity-20">
            <img src="/logo_pack/emblem-on-dark.svg" alt="" class="size-48" />
          </div>
          <div class="relative max-w-2xl">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Come on in</p>
            <h2 class="mt-2 font-serif text-3xl tracking-[-0.04em] text-white sm:text-4xl">
              Your next good moment is waiting.
            </h2>
            <p class="mt-3 text-sm leading-6 text-white/85 sm:text-base">
              Create an account to start finding stays, dining, and experiences that fit you.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <A href="/signup" class="inline-flex h-11 items-center gap-2 rounded-full bg-dry-sage-900 px-5 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-800">
                Join Bakimono <ArrowUpRight size={15} aria-hidden="true" />
              </A>
              <A href="/login" class="inline-flex h-11 items-center rounded-full border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
                Already a member? Sign in
              </A>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="user-features-title" class="border-t border-dust-grey-700 bg-dust-grey-800">
        <div class="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">Made for your plans</p>
          <h2 id="user-features-title" class="mt-2 font-serif text-3xl tracking-[-0.04em] text-dust-grey-100 sm:text-4xl">
            What you can do with Bakimono
          </h2>
          <div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {userFeatures.map(({ title, description, href, Icon }) => (
              <A
                href={href}
                class="group rounded-2xl border border-dust-grey-600 bg-dust-grey-900 p-5 transition hover:-translate-y-1 hover:border-dry-sage-500 hover:shadow-lg"
              >
                <span class="flex size-10 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <h3 class="mt-4 font-serif text-lg text-dust-grey-100">{title}</h3>
                <p class="mt-2 text-sm leading-6 text-dust-grey-300">{description}</p>
                <span class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-hunter-green-500 group-hover:underline">
                  Learn more <ArrowRight size={13} aria-hidden="true" />
                </span>
              </A>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="For providers" class="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div class="relative isolate overflow-hidden rounded-[30px] border border-dry-sage-700 bg-gradient-to-br from-dry-sage-900 via-dust-grey-900 to-dry-sage-800 px-6 py-8 shadow-sm sm:px-9 sm:py-10 lg:px-12">
          <div class="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 overflow-hidden sm:block">
            <img
              src={imageUrl("photo-1517248135467-4c7edcad34c4")}
              alt=""
              class="size-full object-cover opacity-20"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-dry-sage-900 via-dry-sage-900/75 to-pine-teal-100/30" />
          </div>
          <div class="pointer-events-none absolute -right-6 -top-10 opacity-15 sm:right-5 sm:top-1/2 sm:-translate-y-1/2">
            <img src="/logo_pack/emblem.svg" alt="" class="size-36 sm:size-44" />
          </div>
          <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div class="max-w-2xl">
              <span class="inline-flex items-center gap-2 rounded-full border border-dry-sage-700 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-hunter-green-500">
                <Store size={14} aria-hidden="true" />
                Built for providers
              </span>
              <h2 class="mt-4 font-serif text-3xl leading-tight tracking-[-0.04em] text-dust-grey-100 sm:text-4xl">
                Share what makes your place special.
              </h2>
              <p class="mt-3 max-w-xl text-sm leading-6 text-dust-grey-200 sm:text-base">
                Join Bakimono as a provider and bring your stays, dining, or experiences to more people.
              </p>
            </div>
            <div class="relative flex shrink-0 flex-wrap gap-3">
              <A
                href="/provider/signup"
                class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-hunter-green-500 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
              >
                Join as a provider <ArrowUpRight size={15} aria-hidden="true" />
              </A>
              <A
                href="/login"
                class="inline-flex h-12 items-center justify-center rounded-full border border-dry-sage-600 bg-white/60 px-5 text-sm font-semibold text-dust-grey-100 transition hover:border-hunter-green-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
              >
                Provider sign in
              </A>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="provider-features-title" class="border-t border-dust-grey-700 bg-dust-grey-800">
        <div class="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-fern-500">Tools for your business</p>
          <h2 id="provider-features-title" class="mt-2 font-serif text-3xl tracking-[-0.04em] text-dust-grey-100 sm:text-4xl">
            Provider features
          </h2>
          <div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {providerFeatures.map(({ title, description, Icon }) => (
              <article class="rounded-2xl border border-dust-grey-600 bg-dust-grey-900 p-5">
                <span class="flex size-10 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <h3 class="mt-4 font-serif text-lg text-dust-grey-100">{title}</h3>
                <p class="mt-2 text-sm leading-6 text-dust-grey-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
