import { A } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Building2, Check, Clock3, X } from "lucide-solid";

const draftKey = "bakimono-provider-signup-draft";
const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";
const textAreaClass =
  "w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 py-3 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

const emptyForm = {
  name: "",
  address: "",
  county: "",
  opening_time: "",
  closing_time: "",
  desciption: "",
  phone: "",
  email: "",
  image: "",
  category: "",
  size: "",
};

function splitContactValues(value) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function Field(props) {
  return (
    <label class={props.class ?? "block"}>
      <span class="mb-2 block text-sm font-medium text-dust-grey-100">
        {props.label} <span class="text-rose-600">*</span>
      </span>
      {props.children}
      <Show when={props.hint}>
        <span class="mt-1.5 block text-xs leading-5 text-dust-grey-300">{props.hint}</span>
      </Show>
    </label>
  );
}

export default function ProviderSignupPage() {
  const [form, setForm] = createSignal({ ...emptyForm });
  const [saved, setSaved] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [logoName, setLogoName] = createSignal("");
  let logoInput;
  let logoReadVersion = 0;

  onMount(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setForm({
          ...emptyForm,
          ...draft,
          phone: Array.isArray(draft.phone) ? draft.phone.join("\n") : draft.phone,
          email: Array.isArray(draft.email) ? draft.email.join("\n") : draft.email,
          size: draft.size == null ? "" : String(draft.size),
        });
        setLogoName(draft.logoName ?? "Previously selected logo");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your saved provider details: ${error.message}`
          : "Unable to restore your saved provider details.",
      );
    }
  });

  function updateField(event) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleLogoChange(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const currentReadVersion = ++logoReadVersion;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorMessage("Choose a PNG, JPG, or WebP logo file.");
      event.currentTarget.value = "";
      setForm((current) => ({ ...current, image: "" }));
      setLogoName("");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage("The logo file must be 3 MB or smaller.");
      event.currentTarget.value = "";
      setForm((current) => ({ ...current, image: "" }));
      setLogoName("");
      return;
    }
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = () => {
      if (currentReadVersion !== logoReadVersion) return;
      if (typeof reader.result !== "string") {
        setErrorMessage("Unable to read this logo file. Please choose another file.");
        return;
      }
      setForm((current) => ({ ...current, image: reader.result }));
      setLogoName(file.name);
    };
    reader.onerror = () => {
      if (currentReadVersion !== logoReadVersion) return;
      setErrorMessage("Unable to read this logo file. Please choose another file.");
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    logoReadVersion += 1;
    setForm((current) => ({ ...current, image: "" }));
    setLogoName("");
    setErrorMessage("");
    if (logoInput) logoInput.value = "";

    try {
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({ ...form(), image: "", logoName: "" }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to update your saved provider details: ${error.message}`
          : "Unable to update your saved provider details.",
      );
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const details = form();
    if (!details.image) {
      setErrorMessage("Choose a business logo file to continue.");
      return;
    }
    const phones = splitContactValues(details.phone);
    const emails = splitContactValues(details.email);
    if (phones.length === 0 || emails.length === 0) {
      setErrorMessage("Add at least one phone number and one email address.");
      return;
    }
    if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setErrorMessage("Check the email addresses. Separate multiple addresses with commas or new lines.");
      return;
    }
    if (!details.category) {
      setErrorMessage("Choose a business category to continue.");
      return;
    }
    if (details.size === "" || !Number.isInteger(Number(details.size)) || Number(details.size) < 0) {
      setErrorMessage("Enter a whole-number employee count of zero or more.");
      return;
    }

    const draft = {
      ...details,
      phone: phones,
      email: emails,
      size: Number(details.size),
      logoName: logoName(),
    };

    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save your provider details: ${error.message}`
          : "Unable to save your provider details.",
      );
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="/provider"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to providers
        </A>

        <header class="mt-7 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">Provider onboarding · Step 1 of 5</p>
              <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">
                Tell us about your business.
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
                Start with your business details. Every field is required to continue.
              </p>
            </div>
            <span class="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-hunter-green-500 sm:flex">
              <Building2 size={22} aria-hidden="true" />
            </span>
          </div>
          <div class="mt-6" aria-label="Signup progress">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-300">
              <span>Business details</span>
              <span>20%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Provider signup progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="20"
              class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700"
            >
              <div class="h-full w-1/5 rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={saved()} fallback={
          <form onSubmit={handleSubmit} class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
            <div>
              <h2 class="font-serif text-2xl tracking-[-0.035em]">Business information</h2>
              <p class="mt-1 text-sm text-dust-grey-300">All business details are required.</p>
            </div>

            <div class="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Business name" class="block sm:col-span-2">
                <input
                  class={inputClass}
                  name="name"
                  value={form().name}
                  onInput={updateField}
                  placeholder="Your business name"
                  autocomplete="organization"
                  required
                />
              </Field>
              <Field label="Street address">
                <input
                  class={inputClass}
                  name="address"
                  value={form().address}
                  onInput={updateField}
                  placeholder="Street and building"
                  autocomplete="street-address"
                  required
                />
              </Field>
              <Field label="County">
                <input
                  class={inputClass}
                  name="county"
                  value={form().county}
                  onInput={updateField}
                  placeholder="County"
                  required
                />
              </Field>
              <Field label="Opening time">
                <span class="relative block">
                  <Clock3 size={16} class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dust-grey-300" aria-hidden="true" />
                  <input
                    class={`${inputClass} pl-10`}
                    type="time"
                    name="opening_time"
                    value={form().opening_time}
                    onInput={updateField}
                    required
                  />
                </span>
              </Field>
              <Field label="Closing time">
                <span class="relative block">
                  <Clock3 size={16} class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dust-grey-300" aria-hidden="true" />
                  <input
                    class={`${inputClass} pl-10`}
                    type="time"
                    name="closing_time"
                    value={form().closing_time}
                    onInput={updateField}
                    required
                  />
                </span>
              </Field>
              <Field label="Business description" class="block sm:col-span-2">
                <textarea
                  class={`${textAreaClass} min-h-32`}
                  name="desciption"
                  value={form().desciption}
                  onInput={updateField}
                  placeholder="Describe your business and what customers can expect."
                  required
                />
              </Field>
              <Field label="Phone number(s)" hint="Add at least one. Separate multiple numbers with commas or new lines.">
                <textarea
                  class={`${textAreaClass} min-h-24`}
                  name="phone"
                  value={form().phone}
                  onInput={updateField}
                  placeholder="+1 555 000 0000"
                  required
                />
              </Field>
              <Field label="Email address(es)" hint="Add at least one. Separate multiple addresses with commas or new lines.">
                <textarea
                  class={`${textAreaClass} min-h-24`}
                  name="email"
                  value={form().email}
                  onInput={updateField}
                  placeholder="business@example.com"
                  required
                />
              </Field>
              <Field label="Business logo" class="block sm:col-span-2" hint="Choose a PNG, JPG, or WebP file up to 3 MB.">
                <span class="block rounded-xl border border-dust-grey-600 bg-dust-grey-800 p-4">
                  <input
                    ref={logoInput}
                    class="block w-full text-sm text-dust-grey-200 file:mr-4 file:rounded-lg file:border-0 file:bg-hunter-green-500 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-hunter-green-400"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Choose business logo"
                    required={!form().image}
                    onChange={handleLogoChange}
                  />
                  <Show when={logoName()}>
                    <span class="mt-2 block text-xs text-dust-grey-300">Selected: {logoName()}</span>
                  </Show>
                  <Show when={form().image}>
                    <div class="mt-4 flex items-start gap-3">
                      <img
                        src={form().image}
                        alt="Business logo preview"
                        class="size-20 rounded-xl border border-dust-grey-600 bg-white object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-dust-grey-200 transition hover:border-rose-400 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                      >
                        <X size={14} aria-hidden="true" />
                        Remove logo
                      </button>
                    </div>
                  </Show>
                </span>
              </Field>
              <Field label="Business category">
                <select class={inputClass} name="category" value={form().category} onChange={updateField} required>
                  <option value="">Choose a category</option>
                  <option value="airbnb">Airbnb / home rental</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                </select>
              </Field>
              <Field label="Number of employees">
                <input
                  class={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  name="size"
                  value={form().size}
                  onInput={updateField}
                  placeholder="e.g. 8"
                  required
                />
              </Field>
            </div>

            <Show when={errorMessage()}>
              <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage()}
              </p>
            </Show>

            <div class="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-dust-grey-700 pt-5 sm:flex-row sm:items-center">
              <p class="text-xs leading-5 text-dust-grey-300">
                Your details are saved as a temporary draft on this device.
              </p>
              <button
                type="submit"
                class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
              >
                Save business details <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        }>
          <section role="status" class="mt-6 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
            <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
              <Check size={22} aria-hidden="true" />
            </span>
            <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">Business details saved for this session.</h2>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
              Your details are stored temporarily in this browser. Continue to add your business social links.
            </p>
            <div class="mt-5 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => setSaved(false)}
                class="text-sm font-semibold text-hunter-green-500 hover:underline"
              >
                Edit business details
              </button>
              <A
                href="/provider/signup/social"
                class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
              >
                Continue to social links <ArrowRight size={16} aria-hidden="true" />
              </A>
            </div>
          </section>
        </Show>
      </div>
    </main>
  );
}
