import { A } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, FileText, Plus, Trash2 } from "lucide-solid";
import { supabase } from "~/utils/supabase";

const draftKey = "bakimono-provider-signup-draft";
const fileDatabaseName = "bakimono-provider-signup-files";
const documentAccept =
  ".pdf,.png,.jpg,.jpeg,.webp,.docx,application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";
const companyTypes = [
  { value: "individual_provider", label: "Individual provider", description: "An individual operating without a separate registered business entity." },
  { value: "sole_proprietor", label: "Sole proprietor", description: "An individual operating under a sole proprietorship or registered business name." },
  { value: "partnership", label: "Partnership", description: "A business owned by two or more partners." },
  { value: "limited_company", label: "Limited company", description: "A business registered as a limited company." },
  { value: "other_registered_entity", label: "Other registered entity", description: "A registered organization with another legal structure." },
];
const idTypes = [
  { value: "kenyan_national_id", label: "Kenyan National ID" },
  { value: "passport", label: "Passport" },
];
const emptyPartner = () => ({
  id: crypto.randomUUID(),
  name: "",
  id_type: "",
  id_number: "",
  id_documents: [],
});

let fileDatabasePromise;

function openFileDatabase() {
  if (!fileDatabasePromise) {
    fileDatabasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(fileDatabaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("documents")) {
          database.createObjectStore("documents", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open local document storage."));
    });
  }
  return fileDatabasePromise;
}

async function storeDocument(file) {
  const database = await openFileDatabase();
  const id = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("documents", "readwrite");
    transaction.objectStore("documents").put({ id, file });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to store the selected document."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Document storage was interrupted."));
  });
  return { id, name: file.name, type: file.type, size: file.size };
}

async function getStoredDocument(id) {
  const database = await openFileDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction("documents", "readonly").objectStore("documents").get(id);
    request.onsuccess = () => {
      if (!request.result?.file) {
        reject(new Error("A selected document is no longer available in this browser. Please select it again."));
        return;
      }
      resolve(request.result.file);
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to retrieve a selected document."));
  });
}

async function deleteStoredDocument(id) {
  const database = await openFileDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("documents", "readwrite");
    transaction.objectStore("documents").delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to remove the selected document."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Document removal was interrupted."));
  });
}

function safeIdentifier(value) {
  const safeValue = value.trim().replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
  return safeValue || "document";
}

function documentExtension(file) {
  const extensions = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  const extension = extensions[file.type];
  if (!extension) throw new Error(`The file type for "${file.name}" is not supported.`);
  return extension;
}

const emptyVerification = {
  company_type: "",
  legal_name: "",
  id_type: "",
  id_number: "",
  id_documents: [],
  business_name: "",
  business_registration_number: "",
  business_registration_documents: [],
  partnership_documents: [],
  partners: [],
  company_registration_number: "",
  incorporation_documents: [],
  representative_name: "",
  representative_id_type: "",
  representative_id_number: "",
  representative_id_documents: [],
  authority_documents: [],
  entity_type: "",
  entity_registration_number: "",
  entity_registration_documents: [],
};

function Field(props) {
  return (
    <label class={props.class ?? "block"}>
      <span class="mb-2 block text-sm font-medium text-dust-grey-100">
        {props.label}
        <Show when={props.required}><span class="ml-1 text-rose-600">*</span></Show>
        <Show when={!props.required}><span class="ml-1 font-normal text-dust-grey-300">(where applicable)</span></Show>
      </span>
      {props.children}
      <Show when={props.hint}>
        <span class="mt-1.5 block text-xs leading-5 text-dust-grey-300">{props.hint}</span>
      </Show>
    </label>
  );
}

export default function ProviderVerificationPage() {
  const [verification, setVerification] = createSignal({ ...emptyVerification });
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isSaved, setIsSaved] = createSignal(false);
  const [isSkippedForDevelopment, setIsSkippedForDevelopment] = createSignal(false);
  const [isUploading, setIsUploading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) return;
      const draft = JSON.parse(savedDraft);
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) return;

      setDraftAvailable(true);
      const restored = { ...emptyVerification, ...(draft.verification ?? {}) };
      if (!restored.company_type && draft.company_type) {
        restored.company_type =
          draft.company_type === "sole_ownership" ? "sole_proprietor" : draft.company_type;
      }
      if (restored.company_type === "partnership") {
        restored.partners = Array.isArray(restored.partners)
          ? restored.partners.map((partner) => ({
              ...emptyPartner(),
              ...partner,
              id: partner.id ?? crypto.randomUUID(),
              id_documents: Array.isArray(partner.id_documents) ? partner.id_documents : [],
            }))
          : [];
        if (restored.partners.length === 0 && restored.representative_name) {
          restored.partners = [{
            ...emptyPartner(),
            name: restored.representative_name,
            id_type: restored.representative_id_type,
            id_number: restored.representative_id_number,
            id_documents: restored.representative_id_documents ?? [],
          }];
        }
      }
      setVerification(restored);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your provider signup: ${error.message}`
          : "Unable to restore your provider signup.",
      );
    }
  });

  function updateField(name, value) {
    setVerification((current) => ({ ...current, [name]: value }));
  }

  function updatePartner(index, field, value) {
    setVerification((current) => ({
      ...current,
      partners: current.partners.map((partner, partnerIndex) =>
        partnerIndex === index ? { ...partner, [field]: value } : partner,
      ),
    }));
  }

  function addPartner() {
    setVerification((current) => ({
      ...current,
      partners: [...current.partners, emptyPartner()],
    }));
  }

  async function removePartner(index) {
    const partner = verification().partners[index];
    if (!partner) return;
    setErrorMessage("");
    try {
      await Promise.all(partner.id_documents.map((document) => deleteStoredDocument(document.id)));
      setVerification((current) => ({
        ...current,
        partners: current.partners.filter((_, partnerIndex) => partnerIndex !== index),
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to remove partner documents: ${error.message}`
          : "Unable to remove partner documents.",
      );
    }
  }

  async function selectCompanyType(companyType) {
    const current = verification();
    if (companyType === current.company_type) return;

    const documentFields = [
      "id_documents",
      "business_registration_documents",
      "partnership_documents",
      "partners",
      "incorporation_documents",
      "representative_id_documents",
      "authority_documents",
      "entity_registration_documents",
    ];
    const oldDocuments = documentFields.flatMap((field) =>
      field === "partners"
        ? (current.partners ?? []).flatMap((partner) => partner.id_documents ?? [])
        : current[field] ?? [],
    );
    setVerification({ ...emptyVerification, company_type: companyType });
    setIsSaved(false);
    setErrorMessage("");

    const cleanupResults = await Promise.allSettled(
      oldDocuments.map((document) => deleteStoredDocument(document.id)),
    );
    if (cleanupResults.some((result) => result.status === "rejected")) {
      setErrorMessage("Some previous verification files could not be removed from this browser. Remove them from your device's site data if needed.");
    }
  }

  async function addDocuments(name, event, partnerIndex) {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    if (!files.length) return;
    setErrorMessage("");

    const supportedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (files.some((file) => !supportedTypes.includes(file.type))) {
      setErrorMessage("Choose PDF, PNG, JPG, WebP, or DOCX documents.");
      return;
    }
    if (files.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024)) {
      setErrorMessage("Each document must be non-empty and no larger than 10 MB.");
      return;
    }

    setIsUploading(true);
    const storedFiles = [];
    try {
      for (const file of files) storedFiles.push(await storeDocument(file));
      setVerification((current) => name === "partner_id_documents"
        ? {
            ...current,
            partners: current.partners.map((partner, index) =>
              index === partnerIndex
                ? { ...partner, id_documents: [...partner.id_documents, ...storedFiles] }
                : partner,
            ),
          }
        : {
            ...current,
            [name]: [...current[name], ...storedFiles],
          });
    } catch (error) {
      const cleanupResults = await Promise.allSettled(
        storedFiles.map((storedFile) => deleteStoredDocument(storedFile.id)),
      );
      const cleanupFailed = cleanupResults.some((result) => result.status === "rejected");
      setErrorMessage(
        `${error instanceof Error ? `Unable to save selected documents: ${error.message}` : "Unable to save selected documents."}${
          cleanupFailed ? " Some temporary files could not be cleaned up from this browser." : ""
        }`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function removeDocument(name, id, partnerIndex) {
    setErrorMessage("");
    try {
      await deleteStoredDocument(id);
      setVerification((current) => name === "partner_id_documents"
        ? {
            ...current,
            partners: current.partners.map((partner, index) =>
              index === partnerIndex
                ? { ...partner, id_documents: partner.id_documents.filter((document) => document.id !== id) }
                : partner,
            ),
          }
        : {
            ...current,
            [name]: current[name].filter((document) => document.id !== id),
          });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to remove the document: ${error.message}`
          : "Unable to remove the document.",
      );
    }
  }

  function validateVerification(details) {
    if (!details.legal_name.trim()) {
      return details.company_type === "individual_provider"
        ? "Enter your full legal name."
        : details.company_type === "sole_proprietor"
          ? "Enter the owner's full legal name."
          : details.company_type === "partnership"
            ? "Enter the legal name of the partnership."
            : details.company_type === "limited_company"
              ? "Enter the legal company name."
              : "Enter the entity's legal name.";
    }

    if (["individual_provider", "sole_proprietor"].includes(details.company_type)) {
      if (!details.id_type) return "Choose the personal ID document type.";
      if (!details.id_number.trim()) return "Enter the personal ID number.";
      if (!details.id_documents.length) return "Upload at least one personal ID document.";
    }

    if (details.company_type === "sole_proprietor") {
      if (!details.business_name.trim()) return "Enter the business or trading name.";
      if (details.business_registration_number.trim() && !details.business_registration_documents.length) {
        return "Upload the business name registration certificate when providing a registration number.";
      }
      if (details.business_registration_documents.length && !details.business_registration_number.trim()) {
        return "Enter the business registration number for the uploaded business certificate.";
      }
    }

    if (details.company_type === "partnership") {
      if (!details.partnership_documents.length) return "Upload an applicable partnership or business registration document.";
      if (!details.partners.length) return "Add at least one partner.";
      if (details.partners.some((partner) => !partner.name.trim())) return "Enter the full legal name for each partner.";
      if (details.partners.some((partner) => !partner.id_type)) return "Choose an ID document type for each partner.";
      if (details.partners.some((partner) => !partner.id_number.trim())) return "Enter an ID number for each partner.";
      if (details.partners.some((partner) => !partner.id_documents.length)) return "Upload an ID document for each partner.";
    }

    if (details.company_type === "limited_company") {
      if (!details.company_registration_number.trim()) return "Enter the company registration number.";
      if (!details.incorporation_documents.length) return "Upload the certificate of incorporation.";
      if (!details.representative_name.trim()) return "Enter the director or authorized representative's full legal name.";
      if (!details.representative_id_type) return "Choose the representative's ID document type.";
      if (!details.representative_id_number.trim()) return "Enter the representative's ID number.";
      if (!details.representative_id_documents.length) return "Upload the representative's ID document.";
    }

    if (details.company_type === "other_registered_entity") {
      if (!details.entity_type.trim()) return "Enter the registered entity type.";
      if (!details.entity_registration_documents.length) return "Upload an applicable registration certificate or official registration document.";
      if (!details.representative_name.trim()) return "Enter the authorized representative's full legal name.";
      if (!details.representative_id_type) return "Choose the representative's ID document type.";
      if (!details.representative_id_number.trim()) return "Enter the representative's ID number.";
      if (!details.representative_id_documents.length) return "Upload the representative's ID document.";
    }

    return "";
  }

  function legalityRecord(details, providerId) {
    const record = {
      provider_id: providerId,
      updated_at: new Date().toISOString(),
      type: details.company_type,
      personal_name: null,
      id_type: null,
      id_number: null,
      registration_number: null,
      entity_name: null,
      representative_name: null,
    };

    if (["individual_provider", "sole_proprietor"].includes(details.company_type)) {
      record.personal_name = details.legal_name.trim();
      record.id_type = details.id_type || null;
      record.id_number = details.id_number.trim() || null;
    }
    if (details.company_type === "sole_proprietor") {
      record.entity_name = details.business_name.trim();
      record.registration_number = details.business_registration_number.trim() || null;
    } else if (details.company_type === "partnership") {
      record.entity_name = details.legal_name.trim();
      record.registration_number = details.business_registration_number.trim() || null;
    } else if (details.company_type === "limited_company") {
      record.entity_name = details.legal_name.trim();
      record.registration_number = details.company_registration_number.trim() || null;
      record.representative_name = details.representative_name.trim();
      record.id_type = details.representative_id_type || null;
      record.id_number = details.representative_id_number.trim() || null;
    } else if (details.company_type === "other_registered_entity") {
      record.entity_name = details.legal_name.trim();
      record.registration_number = details.entity_registration_number.trim() || null;
      record.representative_name = details.representative_name.trim();
      record.id_type = details.representative_id_type || null;
      record.id_number = details.representative_id_number.trim() || null;
    }

    return record;
  }

  function verificationDocumentPlans(details) {
    const plans = [];
    const addPlans = (field, documents, identifier, partnerIndex = null) => {
      for (const document of documents ?? []) {
        if (!identifier?.trim()) {
          throw new Error(`Enter the matching ID or registration number before uploading "${document.name}".`);
        }
        plans.push({ field, document, identifier, partnerIndex });
      }
    };

    addPlans(
      "id_documents",
      details.id_documents,
      ["individual_provider", "sole_proprietor"].includes(details.company_type) ? details.id_number : "",
    );
    addPlans("business_registration_documents", details.business_registration_documents, details.business_registration_number);
    addPlans(
      "partnership_documents",
      details.partnership_documents,
      details.business_registration_number || details.partners[0]?.id_number,
    );
    addPlans("incorporation_documents", details.incorporation_documents, details.company_registration_number);
    addPlans("representative_id_documents", details.representative_id_documents, details.representative_id_number);
    addPlans(
      "authority_documents",
      details.authority_documents,
      details.representative_id_number || details.partners[0]?.id_number,
    );
    addPlans(
      "entity_registration_documents",
      details.entity_registration_documents,
      details.entity_registration_number || details.representative_id_number,
    );
    for (const [partnerIndex, partner] of details.partners.entries()) {
      addPlans("partner_id_documents", partner.id_documents, partner.id_number, partnerIndex);
    }
    return plans;
  }

  function withDocumentStoragePath(details, plan, storagePath) {
    if (plan.field === "partner_id_documents") {
      return {
        ...details,
        partners: details.partners.map((partner, index) =>
          index === plan.partnerIndex
            ? {
                ...partner,
                id_documents: partner.id_documents.map((document) =>
                  document.id === plan.document.id ? { ...document, storage_path: storagePath } : document,
                ),
              }
            : partner,
        ),
      };
    }
    return {
      ...details,
      [plan.field]: details[plan.field].map((document) =>
        document.id === plan.document.id ? { ...document, storage_path: storagePath } : document,
      ),
    };
  }

  async function uploadVerificationDocuments(details, providerId) {
    let savedDetails = details;
    for (const plan of verificationDocumentPlans(details)) {
      const extension = documentExtension({ name: plan.document.name, type: plan.document.type });
      const filename = `${safeIdentifier(plan.identifier)}.${extension}`;
      const storagePath = `${providerId}/documents/${plan.document.id}/${filename}`;
      if (plan.document.storage_path === storagePath) continue;

      const file = await getStoredDocument(plan.document.id);
      const { error } = await supabase.storage
        .from("provider_images")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });
      if (error) {
        throw new Error(`Unable to upload "${plan.document.name}" to provider_images: ${error.message}`);
      }

      savedDetails = withDocumentStoragePath(savedDetails, plan, storagePath);
      setVerification(savedDetails);
      const savedDraft = JSON.parse(window.sessionStorage.getItem(draftKey) ?? "{}");
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...savedDraft,
          verification: savedDetails,
        }),
      );
    }
    return savedDetails;
  }

  async function saveVerification(skip = false) {
    if (isSaving()) return;
    setErrorMessage("");
    const details = verification();
    if (!skip) {
      if (!details.company_type) {
        setErrorMessage("Choose a company type to continue.");
        return;
      }
      const validationMessage = validateVerification(details);
      if (validationMessage) {
        setErrorMessage(validationMessage);
        return;
      }
    }

    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your provider signup draft could not be found. Complete the earlier steps first.");
        return;
      }

      const draft = JSON.parse(savedDraft);
      let legalitiesEntryId;
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          company_type: details.company_type,
          verification: details,
          ...(skip ? { developmentBypass: true } : {}),
        }),
      );
      if (!skip) {
        if (typeof draft.provider_id !== "string" || !draft.provider_id) {
          setErrorMessage("Your provider record could not be found. Go back and save your business details first.");
          return;
        }
        setIsSaving(true);
        const record = legalityRecord(details, draft.provider_id);
        const { data: existingRecord, error: lookupError } = await supabase
          .from("legalities")
          .select("entry_id")
          .eq("provider_id", draft.provider_id)
          .maybeSingle();
        if (lookupError) throw lookupError;
        legalitiesEntryId = existingRecord?.entry_id;

        if (legalitiesEntryId) {
          const { data, error } = await supabase
            .from("legalities")
            .update(record)
            .eq("entry_id", legalitiesEntryId)
            .select("entry_id")
            .single();
          if (error) throw error;
          legalitiesEntryId = data.entry_id;
        } else {
          const { data, error } = await supabase
            .from("legalities")
            .insert(record)
            .select("entry_id")
            .single();
          if (error) throw error;
          legalitiesEntryId = data.entry_id;
        }
        await uploadVerificationDocuments(details, draft.provider_id);
      }

      const savedDetails = verification();
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          company_type: details.company_type,
          verification: savedDetails,
          ...(legalitiesEntryId ? { legalities_entry_id: legalitiesEntryId } : {}),
          ...(skip ? { developmentBypass: true } : {}),
        }),
      );
      setIsSkippedForDevelopment(skip);
      setIsSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save verification details: ${error.message}`
          : "Unable to save verification details.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const companyTypeLabel = () =>
    companyTypes.find((type) => type.value === verification().company_type)?.label ??
    verification().company_type;

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <Show when={import.meta.env.DEV}>
          <button
            type="button"
            onClick={() => saveVerification(true)}
            class="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Development only: skip this step <ArrowRight size={14} aria-hidden="true" />
          </button>
        </Show>
        <A
          href="/provider/signup/gallery"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to photo gallery
        </A>

        <header class="mt-7 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">Provider onboarding · Step 4 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Verify your business structure.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Select your legal structure and provide the relevant identity and registration documents.
          </p>
          <div class="mt-6" aria-label="Signup progress">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-300">
              <span>Business verification</span>
              <span>80%</span>
            </div>
            <div role="progressbar" aria-label="Provider signup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="80" class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700">
              <div class="h-full w-4/5 rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={!draftAvailable() && !errorMessage()}>
          <section class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete the earlier steps first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-300">Save your provider details before completing verification.</p>
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
                {isSkippedForDevelopment() ? "Verification step skipped for development." : "Verification details saved."}
              </h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                {isSkippedForDevelopment()
                  ? "Verification was bypassed for development."
                  : `Selected company type: ${companyTypeLabel()}. Legal identity and registration fields were saved to Supabase, and documents were uploaded to provider_images/<provider_id>/documents/. Partnership member details remain in this browser.`}
              </p>
              <div class="mt-5 flex flex-wrap items-center gap-5">
                <button type="button" onClick={() => setIsSaved(false)} class="text-sm font-semibold text-hunter-green-500 hover:underline">Edit verification details</button>
                <A href="/provider/signup/payment" class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400">
                  Continue to M-PESA setup <ArrowRight size={16} aria-hidden="true" />
                </A>
              </div>
            </section>
          }>
            <form onSubmit={(event) => { event.preventDefault(); saveVerification(); }} class="mt-6 space-y-6">
              <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                <div class="flex items-start gap-3">
                  <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500"><BadgeCheck size={19} aria-hidden="true" /></span>
                  <div>
                    <h2 class="font-serif text-2xl tracking-[-0.035em]">Company type <span class="text-rose-600">*</span></h2>
                    <p class="mt-1 text-sm text-dust-grey-300">Choose the structure that best describes the provider. Changing this choice clears the current verification details and selected files.</p>
                  </div>
                </div>
                <fieldset class="mt-6 grid gap-3 sm:grid-cols-2">
                  <legend class="sr-only">Select company type</legend>
                  <For each={companyTypes}>
                    {(type) => (
                      <label class={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        verification().company_type === type.value
                          ? "border-hunter-green-500 bg-dry-sage-900 ring-2 ring-hunter-green-500/20"
                          : "border-dust-grey-600 bg-dust-grey-900 hover:border-dry-sage-500"
                      }`}>
                        <input type="radio" name="company_type" value={type.value} checked={verification().company_type === type.value} onChange={() => selectCompanyType(type.value)} disabled={isUploading()} required class="mt-1 size-4 shrink-0 accent-hunter-green-500 disabled:cursor-wait" />
                        <span><span class="block text-sm font-semibold">{type.label}</span><span class="mt-1 block text-xs leading-5 text-dust-grey-300">{type.description}</span></span>
                      </label>
                    )}
                  </For>
                </fieldset>
              </section>

              <Show when={verification().company_type}>
                <section class="space-y-6">
                  <Show when={["individual_provider", "sole_proprietor"].includes(verification().company_type)}>
                    <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                      <h2 class="font-serif text-2xl">Personal identity</h2>
                      <p class="mt-1 text-sm text-dust-grey-300">
                        {verification().company_type === "individual_provider" ? "Individual provider" : "Owner"} details and identification.
                      </p>
                      <div class="mt-5 grid gap-5 sm:grid-cols-2">
                        <Field label="Full legal name" required class="sm:col-span-2">
                          <input class={inputClass} value={verification().legal_name} onInput={(event) => updateField("legal_name", event.currentTarget.value)} autocomplete="name" required />
                        </Field>
                        <Field label="ID document type" required>
                          <select class={inputClass} value={verification().id_type} onChange={(event) => updateField("id_type", event.currentTarget.value)} required>
                            <option value="">Choose document type</option>
                            <For each={idTypes}>{(type) => <option value={type.value}>{type.label}</option>}</For>
                          </select>
                        </Field>
                        <Field label="ID number" required>
                          <input class={inputClass} value={verification().id_number} onInput={(event) => updateField("id_number", event.currentTarget.value)} required />
                        </Field>
                        <DocumentList label="ID document upload" required name="id_documents" documents={verification().id_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} />
                      </div>
                    </section>
                  </Show>

                  <Show when={verification().company_type === "sole_proprietor"}>
                    <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                      <h2 class="font-serif text-2xl">Business registration</h2>
                      <p class="mt-1 text-sm text-dust-grey-300">No certificate of incorporation is needed for a sole proprietor.</p>
                      <div class="mt-5 grid gap-5 sm:grid-cols-2">
                        <Field label="Business or trading name" required class="sm:col-span-2">
                          <input class={inputClass} value={verification().business_name} onInput={(event) => updateField("business_name", event.currentTarget.value)} required />
                        </Field>
                        <Field label="Business registration number">
                          <input class={inputClass} value={verification().business_registration_number} onInput={(event) => updateField("business_registration_number", event.currentTarget.value)} />
                        </Field>
                        <DocumentList label="Business name registration certificate" name="business_registration_documents" documents={verification().business_registration_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} hint="Add this where the business operates under a registered business name." />
                      </div>
                    </section>
                  </Show>

                  <Show when={["partnership", "limited_company", "other_registered_entity"].includes(verification().company_type)}>
                    <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                      <h2 class="font-serif text-2xl">Entity registration</h2>
                      <div class="mt-5 grid gap-5 sm:grid-cols-2">
                        <Field
                          label={verification().company_type === "partnership" ? "Legal name of partnership" : verification().company_type === "limited_company" ? "Legal company name" : "Entity legal name"}
                          required
                          class="sm:col-span-2"
                        >
                          <input class={inputClass} value={verification().legal_name} onInput={(event) => updateField("legal_name", event.currentTarget.value)} required />
                        </Field>
                        <Show when={verification().company_type === "other_registered_entity"}>
                          <Field label="Entity type" required>
                            <input class={inputClass} value={verification().entity_type} onInput={(event) => updateField("entity_type", event.currentTarget.value)} placeholder="For example, trust or association" required />
                          </Field>
                        </Show>
                        <Show when={verification().company_type === "partnership"}>
                          <Field label="Partnership registration number">
                            <input class={inputClass} value={verification().business_registration_number} onInput={(event) => updateField("business_registration_number", event.currentTarget.value)} />
                          </Field>
                        </Show>
                        <Show when={verification().company_type === "limited_company"}>
                          <Field label="Company registration number" required>
                            <input class={inputClass} value={verification().company_registration_number} onInput={(event) => updateField("company_registration_number", event.currentTarget.value)} required />
                          </Field>
                        </Show>
                        <Show when={verification().company_type === "other_registered_entity"}>
                          <Field label="Entity registration number">
                            <input class={inputClass} value={verification().entity_registration_number} onInput={(event) => updateField("entity_registration_number", event.currentTarget.value)} />
                          </Field>
                        </Show>
                        <Show when={verification().company_type === "partnership"}>
                          <DocumentList label="Partnership or business registration documents" required name="partnership_documents" documents={verification().partnership_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} class="sm:col-span-2" hint="Upload applicable partnership or business registration evidence. Multiple files are accepted." />
                        </Show>
                        <Show when={verification().company_type === "limited_company"}>
                          <DocumentList label="Certificate of incorporation" required name="incorporation_documents" documents={verification().incorporation_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} class="sm:col-span-2" />
                        </Show>
                        <Show when={verification().company_type === "other_registered_entity"}>
                          <DocumentList label="Registration certificate or official registration documents" required name="entity_registration_documents" documents={verification().entity_registration_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} class="sm:col-span-2" hint="Requirements depend on the entity type; a certificate of incorporation is not required for every entity." />
                        </Show>
                      </div>
                    </section>
                  </Show>

                  <Show when={["partnership", "limited_company", "other_registered_entity"].includes(verification().company_type)}>
                    <section class="rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
                      <Show
                        when={verification().company_type === "partnership"}
                        fallback={
                          <>
                            <h2 class="font-serif text-2xl">Representative identity</h2>
                            <p class="mt-1 text-sm text-dust-grey-300">Keep the representative’s identification separate from entity documents.</p>
                            <div class="mt-5 grid gap-5 sm:grid-cols-2">
                              <Field label={verification().company_type === "limited_company" ? "Director or authorized representative's full legal name" : "Authorized representative's full legal name"} required class="sm:col-span-2">
                                <input class={inputClass} value={verification().representative_name} onInput={(event) => updateField("representative_name", event.currentTarget.value)} required />
                              </Field>
                              <Field label="Representative's ID document type" required>
                                <select class={inputClass} value={verification().representative_id_type} onChange={(event) => updateField("representative_id_type", event.currentTarget.value)} required>
                                  <option value="">Choose document type</option>
                                  <For each={idTypes}>{(type) => <option value={type.value}>{type.label}</option>}</For>
                                </select>
                              </Field>
                              <Field label="Representative's ID number" required>
                                <input class={inputClass} value={verification().representative_id_number} onInput={(event) => updateField("representative_id_number", event.currentTarget.value)} required />
                              </Field>
                              <DocumentList label="Representative's ID document" required name="representative_id_documents" documents={verification().representative_id_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} class="sm:col-span-2" />
                            </div>
                          </>
                        }
                      >
                        <div class="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h2 class="font-serif text-2xl">Partnership members</h2>
                            <p class="mt-1 text-sm text-dust-grey-300">Add each partner’s legal name and identification details.</p>
                          </div>
                          <button type="button" onClick={addPartner} disabled={isUploading()} class="inline-flex h-10 items-center gap-2 rounded-xl border border-dry-sage-700 px-4 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900 disabled:opacity-60">
                            <Plus size={16} aria-hidden="true" /> Add partner
                          </button>
                        </div>
                        <div class="mt-5 space-y-4">
                          <For each={verification().partners}>
                            {(partner, index) => (
                              <article class="rounded-2xl border border-dust-grey-600 bg-dust-grey-800 p-4 sm:p-5">
                                <div class="mb-4 flex items-center justify-between gap-3">
                                  <h3 class="text-sm font-semibold text-dust-grey-100">Partner {index() + 1}</h3>
                                  <button type="button" onClick={() => removePartner(index())} disabled={isUploading()} aria-label={`Remove partner ${index() + 1}`} class="flex size-9 items-center justify-center rounded-xl text-dust-grey-300 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60">
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </div>
                                <div class="grid gap-5 sm:grid-cols-2">
                                  <Field label="Partner's full legal name" required class="sm:col-span-2">
                                    <input class={inputClass} value={partner.name} onInput={(event) => updatePartner(index(), "name", event.currentTarget.value)} required />
                                  </Field>
                                  <Field label="ID document type" required>
                                    <select class={inputClass} value={partner.id_type} onChange={(event) => updatePartner(index(), "id_type", event.currentTarget.value)} required>
                                      <option value="">Choose document type</option>
                                      <For each={idTypes}>{(type) => <option value={type.value}>{type.label}</option>}</For>
                                    </select>
                                  </Field>
                                  <Field label="ID number" required>
                                    <input class={inputClass} value={partner.id_number} onInput={(event) => updatePartner(index(), "id_number", event.currentTarget.value)} required />
                                  </Field>
                                  <DocumentList
                                    label="Partner's ID document"
                                    required
                                    name="partner_id_documents"
                                    documents={partner.id_documents}
                                    uploading={isUploading()}
                                    onAdd={(name, event) => addDocuments(name, event, index())}
                                    onRemove={(name, id) => removeDocument(name, id, index())}
                                    class="sm:col-span-2"
                                  />
                                </div>
                              </article>
                            )}
                          </For>
                          <Show when={verification().partners.length === 0}>
                            <p class="rounded-xl border border-dashed border-dust-grey-600 px-4 py-6 text-center text-sm text-dust-grey-300">
                              Add at least one partner to provide partnership identity details.
                            </p>
                          </Show>
                        </div>
                      </Show>
                      <div class="mt-5 grid gap-5 sm:grid-cols-2">
                        <DocumentList label="Proof of authority to represent" name="authority_documents" documents={verification().authority_documents} uploading={isUploading()} onAdd={addDocuments} onRemove={removeDocument} class="sm:col-span-2" hint={verification().company_type === "limited_company" ? "Add this if the submitted documents do not establish the representative's authority." : "Add this where necessary, such as an authorization letter or supporting partnership document."} />
                      </div>
                    </section>
                  </Show>
                </section>
              </Show>

              <Show when={errorMessage()}>
                <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
              </Show>
              <div class="flex flex-col-reverse justify-between gap-3 border-t border-dust-grey-700 pt-5 sm:flex-row sm:items-center">
                <p class="text-xs leading-5 text-dust-grey-300">Legal identity and registration fields save to legalities. Documents upload to provider_images/&lt;provider_id&gt;/documents/ with their ID or registration number as the filename. Partnership member details stay in this browser.</p>
                <button type="submit" disabled={isUploading() || isSaving()} class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60">
                  {isSaving() ? "Saving…" : "Save verification details"} <Check size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}

function DocumentList(props) {
  return (
    <div class={props.class ?? ""}>
      <Field label={props.label} required={props.required} hint={props.hint}>
        <input
          class={`${inputClass} h-auto min-h-12 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-hunter-green-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white`}
          type="file"
          accept={documentAccept}
          multiple
          disabled={props.uploading}
          onChange={(event) => props.onAdd(props.name, event)}
        />
        <Show when={props.required}>
          <span class="mt-1 block text-xs text-dust-grey-300">Upload at least one document. You may select multiple files.</span>
        </Show>
        <Show when={props.documents.length > 0}>
          <ul class="mt-3 space-y-2">
            <For each={props.documents}>
              {(document) => (
                <li class="flex items-center justify-between gap-3 rounded-xl border border-dust-grey-700 bg-dust-grey-800 px-3 py-2">
                  <span class="flex min-w-0 items-center gap-2 text-xs text-dust-grey-200">
                    <FileText size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
                    <span class="truncate">{document.name}</span>
                    <span class="shrink-0 text-dust-grey-300">({(document.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <Show when={document.storage_path}>
                      <span class="shrink-0 font-semibold text-hunter-green-500">Uploaded</span>
                    </Show>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${document.name}`}
                    onClick={() => props.onRemove(props.name, document.id)}
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg text-dust-grey-300 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Field>
    </div>
  );
}
