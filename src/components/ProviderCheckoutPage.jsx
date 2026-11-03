import { createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { ArrowRight, ShieldCheck, Smartphone } from "lucide-solid";
import LoadingState from "~/components/LoadingState";
import ProviderStepSavingOverlay from "~/components/ProviderStepSavingOverlay";
import {
  getCurrentProviderBillingStatus,
  getCurrentProviderWorkspace,
} from "~/utils/provider-billing";
import { normalizeKenyanPhone } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

export default function ProviderCheckoutPage() {
  const navigate = useNavigate();
  const [providerId, setProviderId] = createSignal("");
  const [phoneDigits, setPhoneDigits] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isCheckingPayment, setIsCheckingPayment] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [statusMessage, setStatusMessage] = createSignal("");

  onMount(async () => {
    try {
      const workspace = await getCurrentProviderWorkspace();
      if (!workspace) {
        navigate("/provider/login", { replace: true });
        return;
      }
      if (workspace.isBanned) {
        navigate("/provider/dashboard/orders-bookings", { replace: true });
        return;
      }
      if (!workspace.onboardingComplete) {
        navigate("/provider/onboarding", { replace: true });
        return;
      }
      setProviderId(workspace.providerId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load your provider workspace.",
      );
    } finally {
      setIsLoading(false);
    }
  });

  async function startPayment(event) {
    event.preventDefault();
    if (!providerId() || isSubmitting()) return;
    setErrorMessage("");
    setStatusMessage("");

    const phone = normalizeKenyanPhone(phoneDigits());
    if (!phone) {
      setErrorMessage("Enter 9 digits starting with 7 or 1.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: { provider_id: providerId(), phone },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.message || data.statusMessage || "The M-PESA payment request was declined.");
      }

      const accepted = Boolean(
        data
        && (
          data.success === true
          || ["pending", "initiated", "awaiting_response"].includes(String(data.status).toLowerCase())
          || data.paymentId
          || data.payment_id
          || data.message
          || data.statusMessage
        ),
      );
      if (!accepted) throw new Error("The M-PESA payment request could not be started.");
      setStatusMessage(`M-PESA payment prompt sent to ${phone}. Approve it on your phone, then check your payment status.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to initiate M-PESA payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function checkPaymentStatus() {
    if (!providerId() || isCheckingPayment()) return;
    setErrorMessage("");
    setStatusMessage("");
    setIsCheckingPayment(true);

    try {
      const billing = await getCurrentProviderBillingStatus();
      if (billing?.isBanned) {
        navigate("/provider/dashboard/orders-bookings", { replace: true });
        return;
      }
      if (!billing?.onboardingComplete || billing.providerId !== providerId()) {
        navigate("/provider/onboarding", { replace: true });
        return;
      }
      if (billing.hasPaid) {
        navigate("/provider/dashboard/orders-bookings", { replace: true });
        return;
      }
      setStatusMessage("Payment has not been confirmed yet. Approve the M-PESA prompt and try again.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify your payment.");
    } finally {
      setIsCheckingPayment(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 py-10 text-dust-grey-100 sm:px-7 sm:py-16">
      <Show when={isSubmitting() || isCheckingPayment()}>
        <ProviderStepSavingOverlay
          label={isSubmitting() ? "Sending M-PESA payment prompt" : "Checking payment status"}
        />
      </Show>
      <section class="mx-auto max-w-2xl overflow-hidden rounded-4xl border border-dust-grey-600 bg-dust-grey-800 shadow-xl">
        <div class="border-b border-dust-grey-600 bg-dry-sage-900 px-6 py-7 sm:px-10 sm:py-9">
          <div class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <p class="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-fern-text">Provider account setup</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Activate your provider workspace.</h1>
          <p class="mt-3 max-w-xl text-sm leading-6 text-dust-grey-200">
            Complete your one-time provider activation fee to continue to your Bakimono workspace.
          </p>
        </div>

        <div class="px-6 py-7 sm:px-10 sm:py-9">
          <div class="flex items-center justify-between gap-4 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 p-5">
            <div>
              <p class="text-sm font-semibold text-dust-grey-100">One-time activation fee</p>
              <p class="mt-1 text-xs text-dust-grey-text">Pay once to activate this provider account.</p>
            </div>
            <p class="shrink-0 font-serif text-2xl font-semibold text-hunter-green-500">KSh 5,000</p>
          </div>

          <div class="mt-5 flex gap-3 rounded-2xl bg-dry-sage-900 p-4 text-sm leading-6 text-dust-grey-200">
            <Smartphone size={19} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
            <p>Enter the M-PESA number where you want to receive the payment prompt. Approve it on your phone, then check your payment status.</p>
          </div>

          <Show when={errorMessage()}>
            <p role="alert" class="mt-5 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
              {errorMessage()}
            </p>
          </Show>
          <Show when={statusMessage()}>
            <p role="status" class="mt-5 rounded-xl border border-fern-500/30 bg-dry-sage-900 px-4 py-3 text-sm text-dust-grey-200">
              {statusMessage()}
            </p>
          </Show>

          <Show when={!isLoading()} fallback={
            <LoadingState class="mt-6" label="Loading your provider account…" />
          }>
            <form class="mt-6" onSubmit={startPayment}>
              <label for="provider-payment-phone" class="mb-2 block text-sm font-medium text-dust-grey-100">
                M-PESA phone number
              </label>
              <div class="flex h-12 w-full overflow-hidden rounded-xl border border-dust-grey-600 bg-dust-grey-900 focus-within:border-fern-500 focus-within:ring-2 focus-within:ring-dry-sage-700">
                <span class="inline-flex w-16 shrink-0 items-center justify-center border-r border-dust-grey-600 bg-dust-grey-800 text-sm font-semibold text-dust-grey-200">
                  254
                </span>
                <input
                  id="provider-payment-phone"
                  name="phone"
                  type="tel"
                  inputmode="numeric"
                  autocomplete="tel-national"
                  maxlength="9"
                  pattern="[17][0-9]{8}"
                  value={phoneDigits()}
                  onInput={(event) => setPhoneDigits(event.currentTarget.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="712345678"
                  required
                  disabled={!providerId() || isSubmitting()}
                  class="h-12 min-w-0 flex-1 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-400 disabled:opacity-60"
                />
              </div>
              <p class="mt-1.5 text-xs text-dust-grey-text">Enter 9 digits starting with 7 or 1. Do not enter 254 or a leading 0.</p>
              <button
                type="submit"
                disabled={!providerId() || isSubmitting()}
                class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-hunter-green-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 disabled:cursor-wait disabled:opacity-60"
              >
                Pay KSh 5,000 with M-PESA
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
            <button
              type="button"
              disabled={!providerId() || isCheckingPayment()}
              onClick={checkPaymentStatus}
              class="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-dust-grey-600 px-5 py-3 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isCheckingPayment() ? "Checking payment…" : "I’ve paid — check status"}
            </button>
          </Show>
        </div>
      </section>
    </main>
  );
}