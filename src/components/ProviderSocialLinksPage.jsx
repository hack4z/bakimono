import { A } from "@solidjs/router";
import { createSignal, For, Index, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Check, FileText, Link2, Plus, Trash2 } from "lucide-solid";
import { supabase } from "~/utils/supabase-client";
import { providerStorageBucket } from "~/utils/provider-storage";

const draftKey = "bakimono-provider-signup-draft";
const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";
const emptySocialLink = () => ({ provider: "", link: "" });
const emptyPolicy = () => ({ id: crypto.randomUUID(), type: "", file: null });
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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Size unavailable";
  return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(0)} KB`;
}

function policyLabel(type) {
  return policyTypes.find((option) => option.value === type)?.label ?? "Business policy";
}

function policyFileExtension(file) {
  const extensionsByType = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  const extension = extensionsByType[file.type];
  if (extension) return extension;
  throw new Error(`Unable to determine a supported file extension for "${file.name}".`);
}

export default function ProviderSocialLinksPage(props) {
  const [socialLinks, setSocialLinks] = createSignal([emptySocialLink()]);
  const [policies, setPolicies] = createSignal([]);
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [skippedForDevelopment, setSkippedForDevelopment] = createSignal(false);
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
      if (Array.isArray(draft.policies)) {
        setPolicies(draft.policies.map((policy) => ({
          ...policy,
          id: policy.id ?? crypto.randomUUID(),
        })));
      }
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
            ? {
                ...policy,
                file: { name: file.name, type: file.type, bytes: file.size, data },
                storage_path: null,
              }
            : policy,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read the policy file.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting()) return;
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
    if (policies().some((policy) => !policy.type || !policy.file || (!policy.file.data && !policy.storage_path))) {
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
      if (typeof draft.provider_id !== "string" || !draft.provider_id) {
        setErrorMessage("Your provider record could not be found. Go back and save your business details first.");
        return;
      }

      setIsSubmitting(true);
      const policyDrafts = policies().map((policy) => ({
        ...policy,
        id: policy.id ?? crypto.randomUUID(),
      }));
      const { count, error } = await supabase
        .from("providers")
        .update({ social_links: entries, step: "gallery" }, { count: "exact" })
        .eq("provider_id", draft.provider_id);
      if (error) throw error;
      if (count !== 1) {
        throw new Error("The provider record could not be found or you do not have permission to update its social links.");
      }

      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          social_links: entries,
          policies: policyDrafts,
        }),
      );

      const { data: existingFiles, error: listError } = await supabase.storage
        .from(providerStorageBucket)
        .list(`${draft.provider_id}/policies`, { limit: 1000 });
      if (listError) {
        throw new Error(`Unable to check existing policy files: ${listError.message}`);
      }
      const highestExistingNumber = (existingFiles ?? []).reduce((highest, file) => {
        const match = /^(\d+)\.(?:pdf|txt|docx)$/i.exec(file.name);
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0);
      let nextPolicyNumber = highestExistingNumber + 1;
      const savedPolicies = [];
      for (const policy of policyDrafts) {
        if (policy.file?.data) {
          const fileBlob = await (await fetch(policy.file.data)).blob();
          const extension = policyFileExtension(policy.file);
          const storagePath = `${draft.provider_id}/policies/${nextPolicyNumber}.${extension}`;
          nextPolicyNumber += 1;
          const { error: uploadError } = await supabase.storage
            .from(providerStorageBucket)
            .upload(storagePath, fileBlob, {
              contentType: policy.file.type,
              upsert: false,
            });
          if (uploadError) {
            throw new Error(`Unable to upload policy file "${policy.file.name}": ${uploadError.message}`);
          }
          savedPolicies.push({
            ...policy,
            storage_path: storagePath,
            file: {
              name: policy.file.name,
              type: policy.file.type,
              bytes: policy.file.bytes,
            },
          });
        } else {
          savedPolicies.push(policy);
        }
      }

      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          social_links: entries,
          policies: savedPolicies,
        }),
      );
      setPolicies(savedPolicies);
      setSocialLinks(entries);
      setSkippedForDevelopment(false);
      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error || (error && typeof error.message === "string")
          ? `Unable to save your social links: ${error.message}`
          : "Unable to save your social links.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function skipStepForDevelopment() {
    setErrorMessage("");
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your business details could not be found. Go back and complete step 1.");
        return;
      }
      const draft = JSON.parse(savedDraft);
      const entries = socialLinks()
        .filter(({ provider, link }) => provider.trim() && link.trim())
        .map(({ provider, link }) => ({
          provider: provider.trim().toLowerCase(),
          link: link.trim(),
        }));
      const completePolicies = policies()
        .filter(({ type, file }) => type && file)
        .map(({ type, file }) => ({ type, file }));
      if (typeof draft.provider_id === "string" && draft.provider_id) {
        const { data, error: stepError } = await supabase
          .from("providers")
          .update({ step: "gallery" })
          .eq("provider_id", draft.provider_id)
          .select("provider_id")
          .maybeSingle();
        if (stepError) throw stepError;
        if (!data) throw new Error("The provider record could not be found or you do not have permission to save its onboarding progress.");
      }
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          social_links: entries,
          policies: completePolicies,
          developmentBypass: true,
        }),
      );
      setSocialLinks(entries);
      setPolicies(completePolicies);
      setSkippedForDevelopment(true);
      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save your development draft: ${error.message}`
          : "Unable to save your development draft.",
      );
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="#"
          onClick={(event) => {
            event.preventDefault();
            props.onStepChange?.("business");
          }}
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-text"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to business details
        </A>

        <header class="mt-7 rounded-7 border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider onboarding · Step 2 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">
            Add your social links.
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Help customers find you online. Add a social profile or website, and include as many links as you need.
          </p>
          <div class="mt-6">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-text">
              <span>Social links</span>
              <span>40%</span>
            </div>
            <div
              role="progressbar"

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
          <section class="mt-6 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete step 1 first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-text">
              Save your business details before adding social links.
            </p>
            <A
              href="#"
              onClick={(event) => {
                event.preventDefault();
                props.onStepChange?.("business");
              }}
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
              <section role="status" class="mt-6 rounded-7 border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
                <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
                  <Check size={22} aria-hidden="true" />
                </span>
                <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">
                  {skippedForDevelopment() ? "Step skipped for development." : "Social links saved to your provider record."}
                </h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                  {skippedForDevelopment()
                    ? "This step was bypassed without requiring social links or policies."
                    : "Your social links are saved in Supabase and policy files are uploaded to the private providers bucket. Their storage paths are kept in the temporary browser draft."}
                </p>
                <Show when={!skippedForDevelopment() && policies().length > 0}>
                  <section class="mt-6">
                    <h3 class="text-sm font-semibold">Uploaded policy files</h3>
                    <ul class="mt-3 grid gap-3 sm:grid-cols-2">
                      <For each={policies()}>
                        {(policy) => (
                          <li class="flex min-w-0 items-center gap-3 rounded-2xl border border-fern-700 bg-fern-900/50 p-4">
                            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-hunter-green-500 text-white">
                              <FileText size={20} aria-hidden="true" />
                            </span>
                            <span class="min-w-0 flex-1">
                              <span class="block text-xs font-semibold uppercase tracking-wide text-fern-300">{policyLabel(policy.type)}</span>
                              <span class="mt-1 block truncate text-sm font-semibold text-dust-grey-100" title={policy.file?.name}>{policy.file?.name ?? "Policy document"}</span>
                              <span class="mt-1 block text-xs text-dust-grey-text">
                                {formatFileSize(policy.file?.bytes)} · {policy.storage_path ? "Uploaded" : "Saved"}
                              </span>
                            </span>
                            <Check size={18} class="shrink-0 text-fern-300" />
                          </li>
                        )}
                      </For>
                    </ul>
                  </section>
                </Show>
                <div class="mt-5 flex flex-wrap gap-5">
                  <button
                    type="button"
                    onClick={() => setSaved(false)}
                    class="text-sm font-semibold text-hunter-green-500 hover:underline"
                  >
                    Edit social links
                  </button>
                  <A
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      props.onStepChange?.("gallery");
                    }}
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
                  >
                    Continue to photo gallery <ArrowRight size={16} aria-hidden="true" />
                  </A>
                </div>
              </section>
            }
          >
            <form onSubmit={handleSubmit} class="mt-6 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
              <div class="flex items-start gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                  <Link2 size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 class="font-serif text-2xl tracking-[-0.035em]">Social profiles and website</h2>
                  <p class="mt-1 text-sm text-dust-grey-text">Add at least one complete link. Every row needs a provider and a URL.</p>
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <Index each={socialLinks()}>
                  {(socialLink, index) => (
                    <div class="grid gap-3 rounded-2xl border border-dust-grey-700 bg-dust-grey-800 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-end">
                      <label class="block">
                        <span class="mb-2 block text-sm font-medium">Provider <span class="text-rose-600">*</span></span>
                        <select
                          class={inputClass}
                          value={socialLink().provider}
                          required
                          onChange={(event) => updateSocialLink(index, "provider", event.currentTarget.value)}
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
                          value={socialLink().link}
                          required
                          placeholder="https://"
                          autocomplete="url"
                          onInput={(event) => updateSocialLink(index, "link", event.currentTarget.value)}
                        />
                      </label>
                      <button
                        type="button"

                        title="Remove link"
                        disabled={socialLinks().length === 1}
                        onClick={() => setSocialLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-medium text-dust-grey-200 transition hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-11 sm:px-0"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span class="sm:hidden">Remove</span>
                      </button>
                    </div>
                  )}
                </Index>
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
                      Business policies <span class="font-sans text-sm font-normal text-dust-grey-text">(optional)</span>
                    </h3>
                    <p class="mt-1 max-w-2xl text-sm leading-6 text-dust-grey-text">
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
                  <p class="mt-4 rounded-xl bg-dust-grey-800 px-4 py-3 text-xs leading-5 text-dust-grey-text">
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
                          <div class="min-w-0">
                            <span class="mb-2 block text-sm font-medium">Policy file</span>
                            <input
                              id={`provider-policy-file-${policy.id}`}
                              class="peer sr-only"
                              type="file"
                              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

                              onChange={(event) => handlePolicyFileChange(index(), event)}
                            />
                            <label
                              for={`provider-policy-file-${policy.id}`}
                              class="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-hunter-green-400 bg-dry-sage-900 px-4 py-3 text-sm transition hover:border-hunter-green-500 hover:bg-dry-sage-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hunter-green-500"
                            >
                              <span class="flex min-w-0 items-center gap-3">
                                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hunter-green-500 text-white">
                                  <FileText size={17} aria-hidden="true" />
                                </span>
                                <span class="min-w-0">
                                  <span class="block truncate font-semibold text-dust-grey-100">
                                    {policy.file?.name ?? "Choose a policy document"}
                                  </span>
                                  <span class="mt-0.5 block text-xs text-dust-grey-text">
                                    {policy.file
                                      ? `${formatFileSize(policy.file.bytes)} · ${policy.storage_path ? "Uploaded" : "Ready to upload"}`
                                      : "PDF, TXT, or DOCX · 512 KB maximum"}
                                  </span>
                                </span>
                              </span>
                              <span class="shrink-0 rounded-lg bg-hunter-green-500 px-3 py-2 text-xs font-semibold text-white">
                                {policy.file ? "Replace" : "Browse"}
                              </span>
                            </label>
                          </div>
                          <button
                            type="button"

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
                <p class="mt-3 text-xs leading-5 text-dust-grey-text">
                  Accepts PDF, TXT, or DOCX files up to 512 KB each (1 MB total). Files upload as increasing numbers, such as providers/&lt;provider_id&gt;/policies/1.pdf.
                </p>
              </section>

              <div class="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-dust-grey-700 pt-5 sm:flex-row sm:items-center">
                <p class="text-xs leading-5 text-dust-grey-text">Social links are saved to your provider record and policy files upload to the private providers bucket.</p>
                <button
                  type="submit"
                  disabled={isSubmitting()}
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                >
                  {isSubmitting() ? "Saving social links…" : "Save social links"} <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}
