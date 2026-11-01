import { A } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Smartphone } from "lucide-solid";
import { supabase } from "~/utils/supabase-client";
import { normalizeKenyanPhone } from "~/utils/supabase";
import ProviderStepSavingOverlay from "~/components/ProviderStepSavingOverlay";

const draftKey = "bakimono-provider-signup-draft";
const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

export default function ProviderPaymentPage(props) {
  const [tillNumber, setTillNumber] = createSignal("");
  const [mpesaCodeType, setMpesaCodeType] = createSignal("paybill");
  const [ownerUsername, setOwnerUsername] = createSignal("");
  const [ownerPhone, setOwnerPhone] = createSignal("");
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isSaved, setIsSaved] = createSignal(false);
  const [isSkippedForDevelopment, setIsSkippedForDevelopment] = createSignal(false);
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
      setMpesaCodeType(draft.mpesa_code_type === "paybill" ? "paybill" : "paybill");
      const verification = draft.verification ?? {};
      setOwnerUsername(
        draft.provider_member?.name
          ?? draft.provider_member?.username
          ?? (["individual_provider", "sole_proprietor"].includes(verification.company_type)
            ? verification.legal_name
            : verification.representative_name)
          ?? "",
      );
      const savedPhone = normalizeKenyanPhone(draft.provider_member?.phone ?? "");
      setOwnerPhone(savedPhone.startsWith("254") ? savedPhone.slice(3) : "");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your provider signup: ${error.message}`
          : "Unable to restore your provider signup.",
      );
    }
  });

  async function savePaymentDetails(skip = false) {
    if (isSaving()) return;
    setErrorMessage("");
    const till = tillNumber().trim();
    if (!skip && !/^\d+$/.test(till)) {
      setErrorMessage("Enter your M-PESA Paybill number using digits only.");
      return;
    }
    const username = ownerUsername().trim();
    if (!skip && !username) {
      setErrorMessage("Enter the account owner's username.");
      return;
    }
    const phone = normalizeKenyanPhone(`254${ownerPhone()}`);
    if (!skip && !phone) {
      setErrorMessage("Enter 9 digits after 254, starting with 7 or 1.");
      return;
    }

    setIsSaving(true);
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your provider signup draft could not be found. Complete the earlier steps first.");
        return;
      }

      const draft = JSON.parse(savedDraft);
      if (!skip) {
        if (typeof draft.provider_id !== "string" || !draft.provider_id) {
          setErrorMessage("Your provider record could not be found. Go back and save your business details first.");
          return;
        }
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Sign in again before finishing provider signup.");
        const { data: memberships, error: membershipError } = await supabase
          .from("provider_members")
          .select("entry_id, provider_id")
          .eq("member_id", authData.user.id);
        if (membershipError) throw membershipError;
        const matchingMembership = (memberships ?? []).find(
          (membership) => membership.provider_id === draft.provider_id,
        );
        const hasAnotherProviderMembership = (memberships ?? []).some(
          (membership) => membership.provider_id !== draft.provider_id,
        );
        if (!matchingMembership && hasAnotherProviderMembership) {
          throw new Error("This account is already linked to another provider workspace.");
        }
        const { count, error } = await supabase
          .from("providers")
          .update({ mpesa_code_type: mpesaCodeType(), mpesa_code: till, step: "payment" }, { count: "exact" })
          .eq("provider_id", draft.provider_id);
        if (error) throw error;
        if (count !== 1) {
          throw new Error("The provider record could not be found or you do not have permission to save its M-PESA Paybill details.");
        }
        if (matchingMembership) {
          const { data: updatedMember, error: memberError } = await supabase
            .from("provider_members")
            .update({ name: username, phone })
            .eq("entry_id", matchingMembership.entry_id)
            .eq("provider_id", draft.provider_id)
            .select("entry_id")
            .maybeSingle();
          if (memberError) throw memberError;
          if (!updatedMember) throw new Error("Unable to update the provider owner's details.");
        } else {
          const { error: memberError } = await supabase
            .from("provider_members")
            .insert({
              provider_id: draft.provider_id,
              member_id: authData.user.id,
              name: username,
              role: "owner",
              phone,
            });
          if (memberError) throw memberError;
        }
        const { data: completedProvider, error: completionError } = await supabase
          .from("providers")
          .update({ step: "complete" })
          .eq("provider_id", draft.provider_id)
          .select("provider_id")
          .maybeSingle();
        if (completionError) throw completionError;
        if (!completedProvider) throw new Error("Unable to mark provider onboarding as complete.");
      }

      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          payment_method: "mpesa",
          mpesa_code_type: mpesaCodeType(),
          till_number: till,
          provider_member: {
            name: username,
            phone,
            role: "owner",
          },
          ...(skip ? { developmentBypass: true } : {}),
        }),
      );
      if (!skip) setTillNumber(till);
      setIsSkippedForDevelopment(skip);
      window.location.assign("/provider/dashboard");
    } catch (error) {
      const details = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code ? `Code: ${error.code}` : "",
      ].filter(Boolean).join(" — ");
      setErrorMessage(
        details
          ? `Unable to save your M-PESA details: ${details}`
          : "Unable to save your M-PESA details.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <Show when={isSaving()}>
        <ProviderStepSavingOverlay label="Saving payment details" />
      </Show>
      <div class="mx-auto max-w-4xl">
        <A
          href="/provider/dashboard"
          onClick={(event) => {
            event.preventDefault();
            props.onStepChange?.("verification");
          }}
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-text"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to verification
        </A>

        <header class="mt-7 rounded-7 border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider onboarding · Step 5 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Set up how you get paid.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Bakimono currently supports M-PESA for provider payments. Choose how customers should send payments to your business.
          </p>
          <div class="mt-6">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-text">
              <span>Payment details</span>
              <span>100%</span>
            </div>
            <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700">
              <div class="h-full w-full rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={!draftAvailable() && !errorMessage()}>
          <section class="mt-6 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete the earlier steps first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-text">Save your provider details before setting up payment information.</p>
            <A             href="#" onClick={(event) => { event.preventDefault(); props.onStepChange?.("business"); }} class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white hover:bg-hunter-green-400">
              Go to business details <ArrowRight size={16} aria-hidden="true" />
            </A>
          </section>
        </Show>

        <Show when={errorMessage()}>
          <p role="alert" class="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>

        <Show when={draftAvailable()}>
          <Show when={!isSaved()} fallback={
            <section role="status" class="mt-6 rounded-7 border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
              <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white"><Check size={22} aria-hidden="true" /></span>
              <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">
                {isSkippedForDevelopment() ? "Payment step skipped for development." : "Payment details saved for this session."}
              </h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                {isSkippedForDevelopment()
                  ? "This step was bypassed for development."
                : "Your owner username and phone number are saved to the provider team, and your M-PESA details are saved to the provider profile. M-PESA payments are not activated by saving this form."}
              </p>
              <div class="mt-5 flex flex-wrap items-center gap-5">
                <button type="button" onClick={() => setIsSaved(false)} class="text-sm font-semibold text-hunter-green-500 hover:underline">Edit payment details</button>
                <A href="/provider/dashboard" class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400">
                  Finish <Check size={16} aria-hidden="true" />
                </A>
              </div>
            </section>
          }>
            <form onSubmit={(event) => { event.preventDefault(); savePaymentDetails(); }} class="mt-6 space-y-6">
              <section class="overflow-hidden rounded-7 border border-dust-grey-600 bg-dust-grey-900">
                <div class="relative isolate overflow-hidden bg-linear-to-br from-[#063d2e] via-[#075b3c] to-[#043322] p-6 sm:p-9">
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
                        M-PESA is the payment method currently supported on Bakimono. Choose the code type and number where payments should be directed.
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
                      width="208" height="600" />
                    </div>
                  </div>
                </div>

                <div class="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
                  <div class="rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4">
                    <Smartphone size={18} class="text-fern-text" aria-hidden="true" />
                    <h2 class="mt-3 text-sm font-semibold">Mobile payments</h2>
                    <p class="mt-1 text-xs leading-5 text-dust-grey-text">Customers pay using M-PESA.</p>
                  </div>
                  <div class="rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4">
                    <ShieldCheck size={18} class="text-fern-text" aria-hidden="true" />
                    <h2 class="mt-3 text-sm font-semibold">Keep your PIN private</h2>
                    <p class="mt-1 text-xs leading-5 text-dust-grey-text">We only ask for your payment number here, never your M-PESA PIN.</p>
                  </div>
                  <div class="rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4">
                    <Check size={18} class="text-fern-text" aria-hidden="true" />
                    <h2 class="mt-3 text-sm font-semibold">Your payment code</h2>
                    <p class="mt-1 text-xs leading-5 text-dust-grey-text">Use the phone number, Till number, or Paybill where you want business payments directed.</p>
                  </div>
                </div>
              </section>

              <section class="rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                <h2 class="font-serif text-2xl tracking-[-0.035em]">Your M-PESA details</h2>
                <p class="mt-1 text-sm leading-6 text-dust-grey-text">Choose the payment code type associated with your business, then enter its number.</p>
                <label class="mt-5 block max-w-xl">
                  <span class="mb-2 block text-sm font-medium text-dust-grey-100">M-PESA code type <span class="text-rose-600">*</span></span>
                  <div class={`${inputClass} flex items-center`}>Paybill</div>
                </label>
                <label class="mt-5 block max-w-xl">
                  <span class="mb-2 block text-sm font-medium text-dust-grey-100">
                    Paybill number <span class="text-rose-600">*</span>
                  </span>
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
                  <span id="till-number-help" class="mt-1.5 block text-xs leading-5 text-dust-grey-text">Digits only. Do not enter your PIN, password, or one-time code.</span>
                </label>
              </section>

              <section class="rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 class="font-serif text-2xl tracking-[-0.035em]">Account owner</h2>
                    <p class="mt-1 text-sm leading-6 text-dust-grey-text">
                      Enter the owner’s username and phone number for the provider team record.
                    </p>
                  </div>
                  <span class="rounded-full border border-dry-sage-700 bg-dry-sage-900 px-3 py-1.5 text-xs font-semibold text-hunter-green-500">
                    Owner
                  </span>
                </div>
                <label class="mt-5 block max-w-xl">
                  <span class="mb-2 block text-sm font-medium text-dust-grey-100">Owner's username <span class="text-rose-600">*</span></span>
                  <input
                    class={inputClass}
                    type="text"
                    autocomplete="username"
                    maxlength="80"
                    value={ownerUsername()}
                    onInput={(event) => setOwnerUsername(event.currentTarget.value)}
                    placeholder="Enter the account owner's username"
                    required
                  />
                </label>
                <label class="mt-5 block max-w-xl">
                  <span class="mb-2 block text-sm font-medium text-dust-grey-100">Owner's phone number <span class="text-rose-600">*</span></span>
                  <div class="flex h-12 max-w-xl overflow-hidden rounded-xl border border-dust-grey-600 bg-dust-grey-900 focus-within:border-fern-500 focus-within:ring-4 focus-within:ring-dry-sage-900">
                    <span class="inline-flex w-16 shrink-0 items-center justify-center border-r border-dust-grey-600 bg-dust-grey-800 text-sm font-semibold text-dust-grey-200">254</span>
                    <input
                      class="min-w-0 flex-1 bg-transparent px-4 text-sm text-dust-grey-100 outline-none"
                      type="tel"
                      inputmode="numeric"
                      autocomplete="tel-national"
                      maxlength="9"
                      pattern="[17][0-9]{8}"
                      value={ownerPhone()}
                      onInput={(event) => setOwnerPhone(event.currentTarget.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="712345678"
                      required
                    />
                  </div>
                  <p class="mt-1.5 text-xs text-dust-grey-text">Enter 9 digits starting with 7 or 1. Do not enter 254 or a leading 0.</p>
                </label>
              </section>

              <p class="text-xs leading-5 text-dust-grey-text">
                M-PESA details are saved to your provider profile. The owner username and phone number are saved to the provider team record.
              </p>
              <div class="flex justify-end border-t border-dust-grey-700 pt-5">
                <button type="submit" disabled={isSaving()} class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60">
                  {isSaving() ? "Saving…" : "Save payment details"} <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}
