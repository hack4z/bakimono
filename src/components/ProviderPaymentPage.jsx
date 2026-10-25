import { A } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Smartphone } from "lucide-solid";

const draftKey = "bakimono-provider-signup-draft";
const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

export default function ProviderPaymentPage() {
  const [tillNumber, setTillNumber] = createSignal("");
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [isSaved, setIsSaved] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft);
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) return;

      setDraftAvailable(true);
      if (draft.payment_method === "mpesa" && typeof draft.till_number === "string") {
        setTillNumber(draft.till_number);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your provider signup: ${error.message}`
          : "Unable to restore your provider signup.",
      );
    }
  });

  function savePaymentDetails() {
    setErrorMessage("");
    const till = tillNumber().trim();
    if (!/^\d+$/.test(till)) {
      setErrorMessage("Enter your M-PESA Till number using digits only.");
      return;
    }

    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your provider signup draft could not be found. Complete the earlier steps first.");
        return;
      }

      const draft = JSON.parse(savedDraft);
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          payment_method: "mpesa",
          till_number: till,
        }),
      );
      setIsSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save your M-PESA details: ${error.message}`
          : "Unable to save your M-PESA details.",
      );
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="/provider/signup/verification"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to verification
        </A>

        <header class="mt-7 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">Provider onboarding · Step 5 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Set up how you get paid.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Bakimono currently supports M-PESA for provider payments. Add your business Till number to complete this step.
          </p>
          <div class="mt-6" aria-label="Signup progress">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-300">
              <span>Payment details</span>
              <span>100%</span>
            </div>
            <div role="progressbar" aria-label="Provider signup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700">
              <div class="h-full w-full rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={!draftAvailable() && !errorMessage()}>
          <section class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete the earlier steps first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-300">Save your provider details before setting up payment information.</p>
            <A href="/provider/signup" class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white hover:bg-hunter-green-400">
              Go to business details <ArrowRight size={16} aria-hidden="true" />
            </A>
          </section>
        </Show>

        <Show when={errorMessage()}>
          <p role="alert" class="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>

        <Show when={draftAvailable()}>
          <Show when={!isSaved()} fallback={
            <section role="status" class="mt-6 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
              <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white"><Check size={22} aria-hidden="true" /></span>
              <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">
                Payment details saved for this session.
              </h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                Your M-PESA Till number is saved in this browser's temporary signup draft. M-PESA payments are not activated by saving this form.
              </p>
              <div class="mt-5 flex flex-wrap items-center gap-5">
                <button type="button" onClick={() => setIsSaved(false)} class="text-sm font-semibold text-hunter-green-500 hover:underline">Edit payment details</button>
                <A href="/provider" class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400">
                  Finish <Check size={16} aria-hidden="true" />
                </A>
              </div>
            </section>
          }>
            <form onSubmit={(event) => { event.preventDefault(); savePaymentDetails(); }} class="mt-6 space-y-6">
              <section class="overflow-hidden rounded-[28px] border border-dust-grey-600 bg-dust-grey-900">
                <div class="relative isolate overflow-hidden bg-gradient-to-br from-[#063d2e] via-[#075b3c] to-[#043322] p-6 sm:p-9">
                  <div class="absolute -right-16 -top-28 -z-10 size-80 rounded-full border border-white/10" aria-hidden="true" />
                  <div class="absolute -right-2 -top-14 -z-10 size-56 rounded-full border border-white/10" aria-hidden="true" />
                  <div class="absolute bottom-0 left-0 h-1 w-24 bg-[#ed1c24]" aria-hidden="true" />
                  <div class="relative grid items-center gap-7 md:grid-cols-[1fr_auto]">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Provider payments</p>
                      <h2 class="mt-3 max-w-xl font-serif text-2xl tracking-[-0.035em] text-white sm:text-3xl">
                        M-PESA for your business.
                      </h2>
                      <p class="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85">
                        M-PESA is the payment method currently supported on Bakimono. Add your business Till number to tell us where payments should be directed.
                      </p>
                      <span class="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100/20 bg-black/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
                        <span class="size-2 rounded-full bg-[#ed1c24]" aria-hidden="true" />
                        Currently supported method
                      </span>
                    </div>
                    <div class="rounded-2xl bg-white p-4 shadow-xl shadow-black/20 sm:p-5">
                      <img
                        src="/mpesa-logo.svg"
                        alt="M-PESA logo"
                        class="h-auto w-44 sm:w-52"
                      />
                    </div>
                  </div>
                </div>

                <div class="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
                  <div class="rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4">
                    <Smartphone size={18} class="text-fern-500" aria-hidden="true" />
                    <h2 class="mt-3 text-sm font-semibold">Mobile payments</h2>
                    <p class="mt-1 text-xs leading-5 text-dust-grey-300">Customers pay using M-PESA.</p>
                  </div>
                  <div class="rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4">
                    <ShieldCheck size={18} class="text-fern-500" aria-hidden="true" />
                    <h2 class="mt-3 text-sm font-semibold">Keep your PIN private</h2>
                    <p class="mt-1 text-xs leading-5 text-dust-grey-300">We only ask for your Till number here, never your M-PESA PIN.</p>
                  </div>
                  <div class="rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4">
                    <Check size={18} class="text-fern-500" aria-hidden="true" />
                    <h2 class="mt-3 text-sm font-semibold">Business Till</h2>
                    <p class="mt-1 text-xs leading-5 text-dust-grey-300">Use the Till number where you want business payments directed.</p>
                  </div>
                </div>
              </section>

              <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                <h2 class="font-serif text-2xl tracking-[-0.035em]">Your M-PESA details</h2>
                <p class="mt-1 text-sm leading-6 text-dust-grey-300">Enter the numeric Till number associated with your business.</p>
                <label class="mt-5 block max-w-xl">
                  <span class="mb-2 block text-sm font-medium text-dust-grey-100">M-PESA Till number <span class="text-rose-600">*</span></span>
                  <input
                    class={inputClass}
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    maxlength="30"
                    pattern="[0-9]+"
                    value={tillNumber()}
                    onInput={(event) => setTillNumber(event.currentTarget.value)}
                    placeholder="For example, 123456"
                    aria-describedby="till-number-help"
                    required
                  />
                  <span id="till-number-help" class="mt-1.5 block text-xs leading-5 text-dust-grey-300">Digits only. Do not enter your PIN, password, or one-time code.</span>
                </label>
              </section>

              <p class="text-xs leading-5 text-dust-grey-300">
                Payment details are saved in your temporary browser draft only. They are not sent to a payment provider or stored in Supabase yet.
              </p>
              <div class="flex justify-end border-t border-dust-grey-700 pt-5">
                <button type="submit" class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400">
                  Save payment details <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}
