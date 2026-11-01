import { A } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { ArrowLeft, CircleHelp, LifeBuoy, Send } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { supabase } from "~/utils/supabase-client";

const helpContent = {
  customer: {
    eyebrow: "Customer support",
    title: "How can we help?",
    description: "Get help with your Bakimono account, orders, bookings, or payments.",
    backHref: "/settings",
    backLabel: "Back to settings",
    categories: ["Account", "Orders and bookings", "Payments", "Technical issue", "Other"],
    faqs: [
      {
        question: "Where can I find my bookings and orders?",
        answer: "Open Bookings from the navigation to review activity associated with your account.",
      },
      {
        question: "I need help with a payment.",
        answer: "Choose Payments in the support form and include the relevant order details. Do not include your password or full payment card details.",
      },
      {
        question: "How do I update my account details?",
        answer: "Open Settings, then Preferences, to review and edit the profile information available for your account.",
      },
    ],
  },
  provider: {
    eyebrow: "Provider support",
    title: "How can we help?",
    description: "Get help managing your provider workspace, products, bookings, or payments.",
    backHref: "/provider/settings",
    backLabel: "Back to provider settings",
    categories: ["Business profile", "Products and inventory", "Orders and bookings", "Payments", "Team access", "Technical issue", "Other"],
    faqs: [
      {
        question: "Where can I manage my products and availability?",
        answer: "Use Inventory to manage product details and Calendar to review your schedule.",
      },
      {
        question: "Where can I review orders and bookings?",
        answer: "Open Orders & bookings from the provider dashboard navigation.",
      },
      {
        question: "I need help with provider payments.",
        answer: "Choose Payments in the support form and include the relevant record details. Never include your password or payment credentials.",
      },
    ],
  },
};

export default function HelpPage(props) {
  const audience = () => props.isProvider ? "provider" : "customer";
  const content = () => helpContent[audience()];
  const [user, setUser] = createSignal(null);
  const [isLoadingUser, setIsLoadingUser] = createSignal(true);
  const [authError, setAuthError] = createSignal("");
  const [category, setCategory] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [submitError, setSubmitError] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");

  onMount(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(data.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to check your sign-in status.");
    } finally {
      setIsLoadingUser(false);
    }
  });

  async function submitTicket(event) {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const message = description().trim();
    if (!user()) {
      setSubmitError("Sign in before submitting a support request.");
      return;
    }
    if (!category()) {
      setSubmitError("Choose a topic for your support request.");
      return;
    }
    if (message.length < 10) {
      setSubmitError("Please describe the issue in at least 10 characters.");
      return;
    }
    if (message.length > 4000) {
      setSubmitError("Keep your description to 4,000 characters or fewer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("service_tickets").insert({
        user_id: user().id,
        description: message,
        type: `${audience()}: ${category()}`,
      });
      if (error) throw error;

      setDescription("");
      setCategory("");
      setSuccessMessage("Your support request has been submitted.");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `We couldn't submit your request: ${error.message}`
          : "We couldn't submit your request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-3xl">
        <Show when={props.isProvider}>
          <ProviderSignupBanner />
        </Show>
        <A href={content().backHref} class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          {content().backLabel}
        </A>
        <BrandBanner
          eyebrow={content().eyebrow}
          title={content().title}
          description={content().description}
        />

        <section class="mt-7 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
          <div class="flex items-start gap-4">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
              <CircleHelp size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 class="font-serif text-xl text-dust-grey-100">Quick answers</h2>
              <p class="mt-1 text-sm text-dust-grey-text">A few common questions to help you get started.</p>
            </div>
          </div>
          <div class="mt-5 divide-y divide-dust-grey-600">
            <For each={content().faqs}>
              {(faq) => (
                <details class="group py-4">
                  <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-dust-grey-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500">
                    {faq.question}
                    <span class="text-lg text-hunter-green-500 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p class="mt-3 pr-7 text-sm leading-6 text-dust-grey-text">{faq.answer}</p>
                </details>
              )}
            </For>
          </div>
        </section>

        <section class="mt-5 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
          <div class="flex items-start gap-4">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-dry-sage-900 text-hunter-green-500">
              <LifeBuoy size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 class="font-serif text-xl text-dust-grey-100">Contact support</h2>
              <p class="mt-1 text-sm leading-6 text-dust-grey-text">
                Tell us what happened and our support team can follow up through your account.
              </p>
            </div>
          </div>

          <Show when={isLoadingUser()}>
            <p role="status" class="mt-5 text-sm text-dust-grey-text">Checking your sign-in status…</p>
          </Show>
          <Show when={authError()}>
            <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {authError()}
            </p>
          </Show>
          <Show when={!isLoadingUser() && !user() && !authError()}>
            <div class="mt-5 rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-4">
              <p class="text-sm leading-6 text-dust-grey-200">Sign in to submit a support request. Your request will be associated with your account.</p>
              <A href="/login" class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 hover:underline">
                Sign in <ArrowLeft size={14} class="rotate-180" aria-hidden="true" />
              </A>
            </div>
          </Show>
          <Show when={!isLoadingUser() && user()}>
            <form class="mt-5 space-y-4" onSubmit={submitTicket}>
              <label class="block text-sm font-medium text-dust-grey-200">
                What do you need help with?
                <select
                  required
                  value={category()}
                  onChange={(event) => setCategory(event.currentTarget.value)}
                  class="mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none focus:border-fern-500"
                >
                  <option value="">Choose a topic</option>
                  <For each={content().categories}>{(item) => <option value={item}>{item}</option>}</For>
                </select>
              </label>
              <label class="block text-sm font-medium text-dust-grey-200">
                Describe the issue
                <textarea
                  required
                  minLength="10"
                  maxLength="4000"
                  rows="5"
                  value={description()}
                  onInput={(event) => setDescription(event.currentTarget.value)}
                  placeholder="Share the details that will help us understand and resolve this."
                  class="mt-2 w-full resize-y rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 py-3 text-sm leading-6 text-dust-grey-100 outline-none placeholder:text-dust-grey-400 focus:border-fern-500"
                />
                <span class="mt-1 block text-right text-xs text-dust-grey-400">{description().length}/4000</span>
              </label>
              <p class="text-xs leading-5 text-dust-grey-400">Do not include passwords, full card numbers, or other sensitive payment credentials.</p>

              <Show when={submitError()}>
                <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError()}</p>
              </Show>
              <Show when={successMessage()}>
                <p role="status" class="rounded-xl border border-fern-500/30 bg-dry-sage-900 px-4 py-3 text-sm text-hunter-green-500">{successMessage()}</p>
              </Show>

              <button
                type="submit"
                disabled={isSubmitting()}
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
              >
                <Send size={16} aria-hidden="true" />
                {isSubmitting() ? "Submitting…" : "Submit request"}
              </button>
            </form>
          </Show>
        </section>
      </div>
    </main>
  );
}
