import { A } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import {
  ArrowUpRight,
  Boxes,
  Clock3,
  ExternalLink,
  ImagePlus,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Store,
  UsersRound,
  X,
  Trash2,
} from "lucide-solid";
import LoadingState from "~/components/LoadingState";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { getProductCoverUrl } from "~/utils/product-images";
import { getCurrentProvider, getProviderProducts } from "~/utils/provider-data";
import { providerStorageBucket } from "~/utils/provider-storage";
import { supabase } from "~/utils/supabase";

function formatPrice(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(value) {
  if (!value) return "";
  const [hours = "0", minutes = "0"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none transition focus:border-hunter-green-500 focus:ring-2 focus:ring-hunter-green-500/15";
const textAreaClass =
  "mt-2 min-h-28 w-full resize-y rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 py-3 text-sm leading-6 text-dust-grey-100 outline-none transition focus:border-hunter-green-500 focus:ring-2 focus:ring-hunter-green-500/15";

function timeInputValue(value) {
  return String(value ?? "").slice(0, 5);
}

function listInputValue(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function parseList(value) {
  return String(value ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const galleryImageTypes = ["image/jpeg", "image/png", "image/webp"];
const galleryImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function ProviderStorefrontPage() {
  const [provider, setProvider] = createSignal(null);
  const [products, setProducts] = createSignal([]);
  const [logoUrl, setLogoUrl] = createSignal("");
  const [galleryUrls, setGalleryUrls] = createSignal([]);
  const [galleryFiles, setGalleryFiles] = createSignal([]);
  const [providerId, setProviderId] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);
  const [editForm, setEditForm] = createSignal({});
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal("");
  const [saveSuccess, setSaveSuccess] = createSignal("");
  const [isGallerySaving, setIsGallerySaving] = createSignal(false);
  const [galleryError, setGalleryError] = createSignal("");

  async function loadStorefront() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const currentProvider = await getCurrentProvider();
      setProviderId(currentProvider.providerId);
      const [{ data, error }, productRows] = await Promise.all([
        supabase
          .from("providers")
          .select("provider_id, name, address, county, opening_time, closing_time, desciption, phone, email, category, size, social_links")
          .eq("provider_id", currentProvider.providerId)
          .maybeSingle(),
        getProviderProducts(currentProvider.providerId),
      ]);
      if (error) throw error;
      if (!data) throw new Error("The provider profile is not available to this account.");

      setProvider(data);
      const { data: logoFiles, error: logoError } = await supabase.storage
        .from(providerStorageBucket)
        .list(currentProvider.providerId, { limit: 100 });
      if (!logoError) {
        const logoFile = (logoFiles ?? []).find((file) => /^logo\.[a-z0-9]+$/i.test(file.name));
        setLogoUrl(logoFile
          ? supabase.storage
              .from(providerStorageBucket)
              .getPublicUrl(`${currentProvider.providerId}/${logoFile.name}`).data.publicUrl
          : "");
      } else {
        setLogoUrl("");
      }
      const { data: galleryFiles, error: galleryError } = await supabase.storage
        .from(providerStorageBucket)
        .list(`${currentProvider.providerId}/gallery`, { limit: 100 });
      if (!galleryError) {
        const numberedFiles = (galleryFiles ?? [])
          .filter((file) => /^\d+\.[a-z0-9]+$/i.test(file.name))
          .sort((first, second) => {
            const firstNumber = Number(first.name.split(".")[0]);
            const secondNumber = Number(second.name.split(".")[0]);
            return firstNumber - secondNumber;
          });
        setGalleryUrls(numberedFiles.map((file) =>
          supabase.storage
            .from(providerStorageBucket)
            .getPublicUrl(`${currentProvider.providerId}/gallery/${file.name}`).data.publicUrl,
        ));
        setGalleryFiles(numberedFiles.map((file) => ({
          name: file.name,
          path: `${currentProvider.providerId}/gallery/${file.name}`,
          url: supabase.storage
            .from(providerStorageBucket)
            .getPublicUrl(`${currentProvider.providerId}/gallery/${file.name}`).data.publicUrl,
        })));
      } else {
        setGalleryUrls([]);
        setGalleryFiles([]);
      }
      setProducts(await Promise.all(productRows.map(async (product) => ({
        ...product,
        coverUrl: await getProductCoverUrl(product.provider_id, product.product_id),
      }))));
    } catch (error) {
      setProvider(null);
      setProducts([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load your storefront.");
    } finally {
      setIsLoading(false);
    }
  }

  onMount(loadStorefront);

  async function loadGallery() {
    const currentProviderId = providerId() || (await getCurrentProvider()).providerId;
    const { data: files, error } = await supabase.storage
      .from(providerStorageBucket)
      .list(`${currentProviderId}/gallery`, { limit: 100 });
    if (error) throw error;

    const numberedFiles = (files ?? [])
      .filter((file) => /^\d+\.[a-z0-9]+$/i.test(file.name))
      .sort((first, second) =>
        Number(first.name.split(".")[0]) - Number(second.name.split(".")[0]),
      );
    const items = numberedFiles.map((file) => {
      const path = `${currentProviderId}/gallery/${file.name}`;
      return {
        name: file.name,
        path,
        url: supabase.storage.from(providerStorageBucket).getPublicUrl(path).data.publicUrl,
      };
    });
    setGalleryFiles(items);
    setGalleryUrls(items.map((item) => `${item.url}${item.url.includes("?") ? "&" : "?"}v=${Date.now()}`));
  }

  async function uploadGallery(files) {
    if (!files.length || isGallerySaving()) return;
    setGalleryError("");
    const supportedFiles = [...files];
    if (supportedFiles.some((file) => !galleryImageTypes.includes(file.type))) {
      setGalleryError("Choose JPG, PNG, or WebP gallery photos.");
      return;
    }
    if (supportedFiles.some((file) => file.size === 0)) {
      setGalleryError("One or more selected files are empty.");
      return;
    }
    if (galleryFiles().length + supportedFiles.length > 10) {
      setGalleryError("You can add up to 10 gallery photos.");
      return;
    }

    setIsGallerySaving(true);
    try {
      const currentProviderId = providerId() || (await getCurrentProvider()).providerId;
      const existingNumbers = galleryFiles().map((file) => Number(file.name.split(".")[0]));
      let nextNumber = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
      for (const file of supportedFiles) {
        const extension = galleryImageExtensions[file.type];
        const path = `${currentProviderId}/gallery/${nextNumber}.${extension}`;
        const { error } = await supabase.storage
          .from(providerStorageBucket)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        nextNumber += 1;
      }
      await loadGallery();
      setSaveSuccess("Gallery updated.");
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "Unable to upload gallery photos.");
    } finally {
      setIsGallerySaving(false);
    }
  }

  async function removeGalleryPhoto(file) {
    if (isGallerySaving()) return;
    setGalleryError("");
    setIsGallerySaving(true);
    try {
      const { error } = await supabase.storage
        .from(providerStorageBucket)
        .remove([file.path]);
      if (error) throw error;
      await loadGallery();
      setSaveSuccess("Gallery updated.");
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "Unable to remove the gallery photo.");
    } finally {
      setIsGallerySaving(false);
    }
  }

  function openEditor() {
    const current = provider();
    setEditForm({
      name: current?.name ?? "",
      description: current?.desciption ?? "",
      address: current?.address ?? "",
      county: current?.county ?? "",
      opening_time: timeInputValue(current?.opening_time),
      closing_time: timeInputValue(current?.closing_time),
      phone: listInputValue(current?.phone),
      email: listInputValue(current?.email),
      category: current?.category ?? "",
      size: current?.size ?? "",
    });
    setSaveError("");
    setSaveSuccess("");
    setIsEditorOpen(true);
  }

  function updateEditForm(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProviderProfile(event) {
    event.preventDefault();
    if (isSaving()) return;
    setSaveError("");
    setSaveSuccess("");

    const form = editForm();
    const phones = parseList(form.phone);
    const emails = parseList(form.email);
    const size = form.size === "" ? null : Number(form.size);
    if (!String(form.name).trim()) {
      setSaveError("Enter a provider name.");
      return;
    }
    if (!form.opening_time || !form.closing_time) {
      setSaveError("Enter opening and closing times.");
      return;
    }
    if (!Number.isInteger(size ?? 0) || (size !== null && size < 0)) {
      setSaveError("Team size must be a whole number of zero or more.");
      return;
    }

    setIsSaving(true);
    try {
      const { providerId } = await getCurrentProvider();
      const update = {
        name: String(form.name).trim(),
        desciption: String(form.description).trim(),
        address: String(form.address).trim(),
        county: String(form.county).trim(),
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        phone: phones.length ? phones : null,
        email: emails,
        category: form.category || null,
        size,
      };
      const { data, error } = await supabase
        .from("providers")
        .update(update)
        .eq("provider_id", providerId)
        .select("provider_id, name, address, county, opening_time, closing_time, desciption, phone, email, category, size, social_links")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("The provider profile could not be updated.");
      setProvider(data);
      setSaveSuccess("Storefront details updated.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update your storefront.");
    } finally {
      setIsSaving(false);
    }
  }

  const socialLinks = createMemo(() => {
    const links = provider()?.social_links;
    return Array.isArray(links) ? links.filter((link) => link?.url?.trim()) : [];
  });

  const hours = createMemo(() => {
    const current = provider();
    if (!current?.opening_time && !current?.closing_time) return "";
    return `${formatTime(current.opening_time) || "Open"}${current.opening_time && current.closing_time ? " - " : ""}${formatTime(current.closing_time) || ""}`;
  });

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-12 pt-7 text-dust-grey-100 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-6xl">
        <ProviderSignupBanner />

        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Customer view</p>
            <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Storefront</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
              Preview how your business and products appear to customers.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openEditor}
              class="inline-flex h-10 items-center gap-2 rounded-full border border-hunter-green-500 bg-hunter-green-500 px-4 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              <Pencil size={16} aria-hidden="true" />
              Edit storefront
            </button>
            <A
              href="/provider/dashboard/inventory"
              class="inline-flex h-10 items-center gap-2 rounded-full border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm font-semibold text-dust-grey-100 transition hover:border-fern-500 hover:text-hunter-green-500"
            >
              <Pencil size={16} aria-hidden="true" />
              Manage products
            </A>
            <A
              href="/explore"
              class="inline-flex h-10 items-center gap-2 rounded-full bg-hunter-green-500 px-4 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              View marketplace <ExternalLink size={15} aria-hidden="true" />
            </A>
          </div>
        </header>

        <Show when={isLoading()}>
          <LoadingState class="mt-8" label="Loading your storefront…" />
        </Show>

        <Show when={!isLoading() && errorMessage()}>
          <div role="alert" class="mt-8 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-6">
            <p class="text-sm text-dust-grey-200">{errorMessage()}</p>
            <button
              type="button"
              onClick={loadStorefront}
              class="mt-4 rounded-full bg-hunter-green-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </Show>

        <Show when={!isLoading() && !errorMessage() && provider()}>
          <section class="mt-8 overflow-hidden rounded-7 border border-dust-grey-600 bg-dust-grey-800">
            <div class="relative min-h-52 overflow-hidden bg-pine-teal-500 px-6 py-8 sm:px-8 sm:py-10">
              <Show when={logoUrl()}>
                <img
                  src={logoUrl()}
                  alt=""
                  class="absolute inset-0 size-full object-cover"
                width="800" height="600" />
              </Show>
              <div class="absolute inset-0 bg-linear-to-r from-pine-teal-100/95 via-pine-teal-100/75 to-pine-teal-100/20" />
              <div class="relative max-w-2xl text-white">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-dry-sage-800">
                  {provider().category || "Bakimono provider"}
                </p>
                <h2 class="mt-3 font-serif text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">
                  {provider().name}
                </h2>
                <p class="mt-4 max-w-xl text-sm leading-6 text-dry-sage-800 sm:text-base">
                  {provider().desciption || "Discover thoughtful products and services from this provider."}
                </p>
              </div>
            </div>

            <div class="grid gap-px border-t border-dust-grey-600 bg-dust-grey-600 sm:grid-cols-2 lg:grid-cols-3">
              <div class="flex items-start gap-3 bg-dust-grey-800 p-5">
                <MapPin size={18} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">Location</p>
                  <p class="mt-1 text-sm text-dust-grey-100">
                    {[provider().address, provider().county].filter(Boolean).join(", ") || "Location not added"}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-3 bg-dust-grey-800 p-5">
                <Clock3 size={18} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">Opening hours</p>
                  <p class="mt-1 text-sm text-dust-grey-100">{hours() || "Hours not added"}</p>
                </div>
              </div>
              <div class="flex items-start gap-3 bg-dust-grey-800 p-5">
                <Boxes size={18} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">Available</p>
                  <p class="mt-1 text-sm text-dust-grey-100">
                    {products().length} {products().length === 1 ? "product" : "products"}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-3 bg-dust-grey-800 p-5">
                <Phone size={18} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">Phone</p>
                  <p class="mt-1 text-sm text-dust-grey-100">
                    {(provider().phone ?? []).length ? (provider().phone ?? []).join(", ") : "Phone not added"}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-3 bg-dust-grey-800 p-5">
                <Mail size={18} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">Email</p>
                  <p class="mt-1 break-all text-sm text-dust-grey-100">
                    {(provider().email ?? []).length ? (provider().email ?? []).join(", ") : "Email not added"}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-3 bg-dust-grey-800 p-5">
                <UsersRound size={18} class="mt-0.5 shrink-0 text-hunter-green-500" aria-hidden="true" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dust-grey-text">Team size</p>
                  <p class="mt-1 text-sm text-dust-grey-100">
                    {provider().size == null ? "Not specified" : `${provider().size} ${Number(provider().size) === 1 ? "person" : "people"}`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Show when={galleryUrls().length}>
            <section class="mt-8">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Inside the space</p>
              <h2 class="mt-1 font-serif text-2xl tracking-[-0.03em]">Gallery</h2>
              <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <For each={galleryUrls()}>
                  {(url, index) => (
                    <div class={`overflow-hidden rounded-[20px] bg-dry-sage-800 ${index() === 0 ? "col-span-2 row-span-2 sm:col-span-2" : ""}`}>
                      <img
                        src={url}
                        alt={`${provider().name} gallery photo ${index() + 1}`}
                        class="aspect-square size-full object-cover"
                        loading="lazy"
                      width="800" height="600" />
                    </div>
                  )}
                </For>
              </div>
            </section>
          </Show>

          <div class="mt-8 flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Your collection</p>
              <h2 class="mt-1 font-serif text-2xl tracking-[-0.03em]">Featured products</h2>
            </div>
            <A href="/provider/dashboard/inventory" class="inline-flex items-center gap-1 text-sm font-semibold text-hunter-green-500 hover:underline">
              Edit inventory <ArrowUpRight size={15} aria-hidden="true" />
            </A>
          </div>

          <Show
            when={products().length}
            fallback={
              <div class="mt-5 rounded-3xl border border-dashed border-dust-grey-600 bg-dust-grey-800 px-6 py-12 text-center">
                <Package size={28} class="mx-auto text-dust-grey-text" aria-hidden="true" />
                <h3 class="mt-3 font-serif text-xl">Your collection is empty</h3>
                <p class="mt-2 text-sm text-dust-grey-text">Add your first product to start building your storefront.</p>
                <A href="/provider/dashboard/inventory" class="mt-4 inline-flex rounded-full bg-hunter-green-500 px-4 py-2 text-sm font-semibold text-white">
                  Add a product
                </A>
              </div>
            }
          >
            <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <For each={products().slice(0, 6)}>
                {(product) => (
                  <article class="overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-800 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div class="aspect-[4/3] bg-dry-sage-800">
                      <Show
                        when={product.coverUrl}
                        fallback={<div class="flex size-full items-center justify-center text-dust-grey-text"><Store size={30} aria-hidden="true" /></div>}
                      >
                        <img src={product.coverUrl} alt="" class="size-full object-cover" loading="lazy" width="800" height="600" />
                      </Show>
                    </div>
                    <div class="p-5">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-fern-text">{product.type || "Product"}</p>
                          <h3 class="mt-1 truncate font-serif text-xl">{product.name}</h3>
                        </div>
                        <p class="shrink-0 text-sm font-semibold text-hunter-green-500">{formatPrice(product.price)}</p>
                      </div>
                      <p class="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-dust-grey-text">
                        {product.description || "No description added yet."}
                      </p>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </Show>

          <Show when={socialLinks().length}>
            <section class="mt-8 rounded-3xl border border-dust-grey-600 bg-dry-sage-900 p-5 sm:p-6">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-fern-text">Find us online</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <For each={socialLinks()}>
                  {(link) => (
                    <a href={link.url} target="_blank" rel="noreferrer" class="inline-flex h-10 items-center gap-2 rounded-full border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm font-semibold text-dust-grey-100 hover:border-fern-500 hover:text-hunter-green-500">
                      {link.label || link.platform || "Visit link"} <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  )}
                </For>
              </div>
            </section>
          </Show>
        </Show>
      </div>
      <Show when={isEditorOpen()}>
        <div class="fixed inset-0 z-65">
          <button
            type="button"
            aria-label="Close storefront editor"
            onClick={() => setIsEditorOpen(false)}
            class="absolute inset-0 bg-pine-teal-100/55 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="storefront-editor-title"
            class="animate-product-drawer-in motion-reduce:animate-none absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-dust-grey-600 bg-dust-grey-900 shadow-2xl"
          >
            <header class="flex items-start justify-between gap-4 border-b border-dust-grey-600 px-5 py-5 sm:px-7">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider details</p>
                <h2 id="storefront-editor-title" class="mt-1 font-serif text-2xl tracking-[-0.03em]">Edit storefront</h2>
              </div>
              <button
                type="button"
                aria-label="Close storefront editor"
                onClick={() => setIsEditorOpen(false)}
                class="flex size-10 shrink-0 items-center justify-center rounded-full text-dust-grey-text transition hover:bg-dry-sage-900 hover:text-dust-grey-100"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={saveProviderProfile} class="flex min-h-0 flex-1 flex-col">
              <div class="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
                <label class="block text-sm font-semibold text-dust-grey-100">
                  Business name
                  <input type="text" required value={editForm().name ?? ""} onInput={(event) => updateEditForm("name", event.currentTarget.value)} class={inputClass} />
                </label>
                <label class="block text-sm font-semibold text-dust-grey-100">
                  Description
                  <textarea value={editForm().description ?? ""} onInput={(event) => updateEditForm("description", event.currentTarget.value)} class={textAreaClass} />
                </label>
                <label class="block text-sm font-semibold text-dust-grey-100">
                  Category
                  <select value={editForm().category ?? ""} onChange={(event) => updateEditForm("category", event.currentTarget.value)} class={inputClass}>
                    <option value="">Not specified</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="hotel">Hotel</option>
                  </select>
                </label>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block text-sm font-semibold text-dust-grey-100">
                    Address
                    <input type="text" value={editForm().address ?? ""} onInput={(event) => updateEditForm("address", event.currentTarget.value)} class={inputClass} />
                  </label>
                  <label class="block text-sm font-semibold text-dust-grey-100">
                    County
                    <input type="text" value={editForm().county ?? ""} onInput={(event) => updateEditForm("county", event.currentTarget.value)} class={inputClass} />
                  </label>
                  <label class="block text-sm font-semibold text-dust-grey-100">
                    Opening time
                    <input type="time" required value={editForm().opening_time ?? ""} onInput={(event) => updateEditForm("opening_time", event.currentTarget.value)} class={inputClass} />
                  </label>
                  <label class="block text-sm font-semibold text-dust-grey-100">
                    Closing time
                    <input type="time" required value={editForm().closing_time ?? ""} onInput={(event) => updateEditForm("closing_time", event.currentTarget.value)} class={inputClass} />
                  </label>
                </div>

                <label class="block text-sm font-semibold text-dust-grey-100">
                  Phone numbers
                  <textarea value={editForm().phone ?? ""} onInput={(event) => updateEditForm("phone", event.currentTarget.value)} placeholder="Separate multiple numbers with commas" class={`${textAreaClass} min-h-20`} />
                </label>
                <label class="block text-sm font-semibold text-dust-grey-100">
                  Email addresses
                  <textarea value={editForm().email ?? ""} onInput={(event) => updateEditForm("email", event.currentTarget.value)} placeholder="Separate multiple addresses with commas" class={`${textAreaClass} min-h-20`} />
                </label>
                <label class="block text-sm font-semibold text-dust-grey-100">
                  Team size
                  <input type="number" min="0" step="1" value={editForm().size ?? ""} onInput={(event) => updateEditForm("size", event.currentTarget.value)} class={inputClass} />
                </label>
                <section class="border-t border-dust-grey-600 pt-5">
                  <div class="flex items-end justify-between gap-4">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-fern-text">Provider photos</p>
                      <h3 class="mt-1 font-serif text-xl">Gallery</h3>
                    </div>
                    <label class={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-dust-grey-600 px-4 text-sm font-semibold text-dust-grey-100 transition hover:border-fern-500 ${isGallerySaving() ? "pointer-events-none opacity-60" : ""}`}>
                      <ImagePlus size={16} aria-hidden="true" />
                      Add photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        class="sr-only"
                        disabled={isGallerySaving()}
                        onChange={(event) => {
                          const files = [...(event.currentTarget.files ?? [])];
                          event.currentTarget.value = "";
                          void uploadGallery(files);
                        }}
                      />
                    </label>
                  </div>
                  <p class="mt-2 text-xs text-dust-grey-text">Up to 10 JPG, PNG, or WebP photos.</p>

                  <Show
                    when={galleryFiles().length}
                    fallback={<p class="mt-4 rounded-xl border border-dashed border-dust-grey-600 px-4 py-6 text-center text-sm text-dust-grey-text">No gallery photos added.</p>}
                  >
                    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <For each={galleryFiles()}>
                        {(file) => (
                          <div class="group relative aspect-square overflow-hidden rounded-2xl bg-dry-sage-800">
                            <img src={file.url} alt="" class="size-full object-cover" width="800" height="600" />
                            <button
                              type="button"
                              aria-label={`Remove gallery photo ${file.name}`}
                              disabled={isGallerySaving()}
                              onClick={() => void removeGalleryPhoto(file)}
                              class="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-dust-grey-900 text-dust-grey-100 shadow transition hover:bg-red-600 hover:text-white disabled:opacity-60"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={galleryError()}>
                    <p role="alert" class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{galleryError()}</p>
                  </Show>
                </section>

                <Show when={saveError()}>
                  <p role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError()}</p>
                </Show>
                <Show when={saveSuccess()}>
                  <p role="status" class="rounded-xl border border-hunter-green-500/20 bg-hunter-green-500/10 px-4 py-3 text-sm text-hunter-green-500">{saveSuccess()}</p>
                </Show>
              </div>

              <footer class="flex justify-end gap-3 border-t border-dust-grey-600 bg-dust-grey-900 px-5 py-4 sm:px-7">
                <button type="button" onClick={() => setIsEditorOpen(false)} class="h-10 rounded-full border border-dust-grey-600 px-5 text-sm font-semibold text-dust-grey-100 transition hover:border-fern-500">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving()} class="h-10 rounded-full bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving() ? "Saving…" : "Save changes"}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      </Show>
    </main>
  );
}
