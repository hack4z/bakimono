import { A } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Check, FileText, Link2, Plus, Trash2 } from "lucide-solid";

const draftKey = "bakimono-provider-signup-draft";
const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";
const emptySocialLink = () => ({ provider: "", link: "" });
const emptyPolicy = () => ({ type: "", file: null });
const policyTypes = [
  { value: "terms-and-conditions", label: "Terms and conditions" },
  { value: "privacy-policy", label: "Privacy policy" },
  { value: "cancellation-policy", label: "Cancellation policy" },
  { value: "refund-policy", label: "Refund policy" },
  { value: "house-rules", label: "House rules" },
  { value: "other", label: "Other policy" },
];
const maxPolicyFileBytes = 512 * 1024;
const maxPolicyBytes = 1024 * 1024;
const providers = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "website", label: "Website" },
];
const policyInputClass =
  "h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none transition focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900 file:mr-3 file:rounded-lg file:border-0 file:bg-hunter-green-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white";

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function ProviderSocialLinksPage() {
  const [socialLinks, setSocialLinks] = createSignal([emptySocialLink()]);
  const [policies, setPolicies] = createSignal([]);
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft);
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) return;

      setDraftAvailable(true);
      if (Array.isArray(draft.social_links) && draft.social_links.length > 0) {
        setSocialLinks(
          draft.social_links.map((socialLink) => ({
            provider: socialLink.provider ?? "",
            link: socialLink.link ?? "",
          })),
        );
      }
      if (Array.isArray(draft.policies)) setPolicies(draft.policies);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your provider signup: ${error.message}`
          : "Unable to restore your provider signup.",
      );
    }
  });

  function updateSocialLink(index, field, value) {
    setSocialLinks((current) =>
      current.map((socialLink, itemIndex) =>
        itemIndex === index ? { ...socialLink, [field]: value } : socialLink,
      ),
    );
  }

  function updatePolicyType(index, type) {
    setPolicies((current) =>
      current.map((policy, itemIndex) => itemIndex === index ? { ...policy, type } : policy),
    );
  }

  async function handlePolicyFileChange(index, event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setErrorMessage("");

    const supportedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!supportedTypes.includes(file.type)) {
      setErrorMessage("Choose a PDF, TXT, or DOCX policy file.");
      return;
    }
    if (file.size === 0 || file.size > maxPolicyFileBytes) {
      setErrorMessage("Each policy file must be non-empty and 512 KB or smaller.");
      return;
    }
    const otherPolicyBytes = policies().reduce(
      (total, policy, itemIndex) => total + (itemIndex === index ? 0 : policy.file?.bytes ?? 0),
      0,
    );
    if (otherPolicyBytes + file.size > maxPolicyBytes) {
      setErrorMessage("Policy files must total no more than 1 MB for a temporary signup draft.");
      return;
    }

    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error(`Unable to read ${file.name}.`));
        reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
        reader.readAsDataURL(file);
      });
      setPolicies((current) =>
        current.map((policy, itemIndex) =>
          itemIndex === index
            ? { ...policy, file: { name: file.name, type: file.type, bytes: file.size, data } }
            : policy,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read the policy file.");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const entries = socialLinks().map(({ provider, link }) => ({
      provider: provider.trim().toLowerCase(),
      link: link.trim(),
    }));

    if (entries.length === 0 || entries.some(({ provider, link }) => !provider || !link)) {
      setErrorMessage("Add at least one complete social profile or website link.");
      return;
    }
    if (entries.some(({ provider }) => !providers.some((option) => option.value === provider))) {
      setErrorMessage("Choose Facebook, Instagram, X, or Website for each link.");
      return;
    }
    if (entries.some(({ link }) => !isHttpUrl(link))) {
      setErrorMessage("Enter a valid link starting with http:// or https:// for each entry.");
      return;
    }
    if (policies().some((policy) => !policy.type || !policy.file)) {
      setErrorMessage("For each policy you add, choose both a policy type and a file.");
      return;
    }

    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your business details could not be found. Go back and complete step 1.");
        return;
      }

      const draft = JSON.parse(savedDraft);
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          social_links: entries,
          policies: policies().map(({ type, file }) => ({ type, file })),
        }),
      );
      setSocialLinks(entries);
      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save your social links: ${error.message}`
          : "Unable to save your social links.",
      );
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="/provider/signup"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to business details
        </A>

        <header class="mt-7 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">Provider onboarding · Step 2 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">
            Add your social links.
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Help customers find you online. Add a social profile or website, and include as many links as you need.
          </p>
          <div class="mt-6" aria-label="Signup progress">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-300">
              <span>Social links</span>
              <span>40%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Provider signup progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="40"
              class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700"
            >
              <div class="h-full w-2/5 rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={!draftAvailable() && !errorMessage()}>
          <section class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete step 1 first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-300">
              Save your business details before adding social links.
            </p>
            <A
              href="/provider/signup"
              class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white hover:bg-hunter-green-400"
            >
              Go to business details <ArrowRight size={16} aria-hidden="true" />
            </A>
          </section>
        </Show>

        <Show when={errorMessage()}>
          <p role="alert" class="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage()}
          </p>
        </Show>

        <Show when={draftAvailable()}>
          <Show
            when={!saved()}
            fallback={
              <section role="status" class="mt-6 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
                <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
                  <Check size={22} aria-hidden="true" />
                </span>
                <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">
                  Social links saved for this session.
                </h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                  Your social links are saved in your temporary provider signup draft.
                </p>
                <div class="mt-5 flex flex-wrap gap-5">
                  <button
                    type="button"
                    onClick={() => setSaved(false)}
                    class="text-sm font-semibold text-hunter-green-500 hover:underline"
                  >
                    Edit social links
                  </button>
                  <A
                    href="/provider/signup/gallery"
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
                  >
                    Continue to photo gallery <ArrowRight size={16} aria-hidden="true" />
                  </A>
                </div>
              </section>
            }
          >
            <form onSubmit={handleSubmit} class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
              <div class="flex items-start gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                  <Link2 size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 class="font-serif text-2xl tracking-[-0.035em]">Social profiles and website</h2>
                  <p class="mt-1 text-sm text-dust-grey-300">Add at least one complete link. Every row needs a provider and a URL.</p>
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <For each={socialLinks()}>
                  {(socialLink, index) => (
                    <div class="grid gap-3 rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-end">
                      <label class="block">
                        <span class="mb-2 block text-sm font-medium">Provider <span class="text-rose-600">*</span></span>
                        <select
                          class={inputClass}
                          value={socialLink.provider}
                          required
                          onChange={(event) => updateSocialLink(index(), "provider", event.currentTarget.value)}
                        >
                          <option value="">Choose a provider</option>
                          <For each={providers}>
                            {(provider) => <option value={provider.value}>{provider.label}</option>}
                          </For>
                        </select>
                      </label>
                      <label class="block">
                        <span class="mb-2 block text-sm font-medium">Link <span class="text-rose-600">*</span></span>
                        <input
                          class={inputClass}
                          type="url"
                          value={socialLink.link}
                          required
                          placeholder="https://"
                          autocomplete="url"
                          onInput={(event) => updateSocialLink(index(), "link", event.currentTarget.value)}
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove social link ${index() + 1}`}
                        title="Remove link"
                        disabled={socialLinks().length === 1}
                        onClick={() => setSocialLinks((current) => current.filter((_, itemIndex) => itemIndex !== index()))}
                        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-medium text-dust-grey-200 transition hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-11 sm:px-0"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span class="sm:hidden">Remove</span>
                      </button>
                    </div>
                  )}
                </For>
              </div>

              <button
                type="button"
                onClick={() => setSocialLinks((current) => [...current, emptySocialLink()])}
                class="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-dry-sage-700 px-4 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900"
              >
                <Plus size={16} aria-hidden="true" />
                Add another link
              </button>

              <section aria-labelledby="provider-policies-title" class="mt-8 border-t border-dust-grey-700 pt-6">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 id="provider-policies-title" class="font-serif text-xl tracking-[-0.03em]">
                      Business policies <span class="font-sans text-sm font-normal text-dust-grey-300">(optional)</span>
                    </h3>
                    <p class="mt-1 max-w-2xl text-sm leading-6 text-dust-grey-300">
                      Add policy documents for customers to review. Choose a type and upload the matching file for each policy.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPolicies((current) => [...current, emptyPolicy()])}
                    class="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-dry-sage-700 px-4 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add policy
                  </button>
                </div>
                <Show when={policies().length > 0} fallback={
                  <p class="mt-4 rounded-xl bg-dust-grey-800 px-4 py-3 text-xs leading-5 text-dust-grey-300">
                    No policy documents added. This section is optional.
                  </p>
                }>
                  <div class="mt-4 space-y-3">
                    <For each={policies()}>
                      {(policy, index) => (
                        <div class="grid gap-3 rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-end">
                          <label class="block">
                            <span class="mb-2 block text-sm font-medium">Policy type</span>
                            <select
                              class={policyInputClass}
                              value={policy.type}
                              required
                              onChange={(event) => updatePolicyType(index(), event.currentTarget.value)}
                            >
                              <option value="">Choose a policy</option>
                              <For each={policyTypes}>
                                {(option) => <option value={option.value}>{option.label}</option>}
                              </For>
                            </select>
                          </label>
                          <label class="block">
                            <span class="mb-2 block text-sm font-medium">Policy file</span>
                            <input
                              class={policyInputClass}
                              type="file"
                              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(event) => handlePolicyFileChange(index(), event)}
                            />
                            <Show when={policy.file}>
                              <span class="mt-1.5 flex items-center gap-1.5 text-xs text-dust-grey-300">
                                <FileText size={13} aria-hidden="true" />
                                {policy.file.name}
                              </span>
                            </Show>
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove policy ${index() + 1}`}
                            onClick={() => setPolicies((current) => current.filter((_, itemIndex) => itemIndex !== index()))}
                            class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-medium text-dust-grey-200 transition hover:border-rose-400 hover:text-rose-700 sm:w-10 sm:px-0"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                            <span class="sm:hidden">Remove policy</span>
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
                <p class="mt-3 text-xs leading-5 text-dust-grey-300">
                  Accepts PDF, TXT, or DOCX files up to 512 KB each (1 MB total). Files stay in the temporary signup draft.
                </p>
              </section>

              <div class="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-dust-grey-700 pt-5 sm:flex-row sm:items-center">
                <p class="text-xs leading-5 text-dust-grey-300">Social links and selected policy files are saved in your temporary signup draft.</p>
                <button
                  type="submit"
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                >
                  Save social links <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}
