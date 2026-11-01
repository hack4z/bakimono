import { A, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { ImagePlus, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { getProductCoverUrl } from "~/utils/product-images";
import { providerStorageBucket } from "~/utils/provider-storage";
import { supabase } from "~/utils/supabase-client";
import { getCurrentProvider } from "~/utils/provider-data";

const inputClass =
  "h-11 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-900";
const textAreaClass =
  "w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 py-2.5 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-900";

const emptyProduct = () => ({
  name: "",
  description: "",
  price: "",
  type: "",
  cover_image: "",
  capacity: "",
  provider_policy: "",
  quantity: "",
});

function formatPrice(price) {
  const amount = Number(price);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
    : "—";
}

function imageExtension(file) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return extensions[file.type];
}

export default function ProviderInventoryPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = createSignal([]);
  const [providerId, setProviderId] = createSignal("");
  const [form, setForm] = createSignal(emptyProduct());
  const [editingProductId, setEditingProductId] = createSignal("");
  const [selectedImage, setSelectedImage] = createSignal(null);
  const [selectedImagePreview, setSelectedImagePreview] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");
  const [pinnedProductId, setPinnedProductId] = createSignal(searchParams.productId ?? "");
  const [productPendingDelete, setProductPendingDelete] = createSignal(null);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal("");
  let imageInput;

  async function loadProducts() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const currentProvider = await getCurrentProvider();
      setProviderId(currentProvider.providerId);
      const { data, error } = await supabase
        .from("products")
        .select("entry_id, created_at, updated_at, product_id, provider_id, name, description, price, type, capacity, provider_policy, quantity, rating, ingredients")
        .eq("provider_id", currentProvider.providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(await Promise.all((data ?? []).map(async (product) => ({
        ...product,
        coverImageUrl: await getProductCoverUrl(product.provider_id, product.product_id),
      }))));
    } catch (error) {
      setProducts([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider products.");
    } finally {
      setIsLoading(false);
    }
  }

  onMount(() => void loadProducts());

  const filteredProducts = createMemo(() => {
    const query = searchQuery().trim().toLowerCase();
    return products().filter((product) =>
      (!pinnedProductId() || product.product_id === pinnedProductId())
      &&
      [product.name, product.description, product.type, product.capacity]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  });

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function clearSelectedImage() {
    const preview = selectedImagePreview();
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSelectedImage(null);
    setSelectedImagePreview("");
    if (imageInput) imageInput.value = "";
  }

  function selectImage(file) {
    clearSelectedImage();
    if (!file) return;
    setSelectedImage(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  }

  onCleanup(clearSelectedImage);

  function beginEdit(product) {
    setErrorMessage("");
    setSuccessMessage("");
    clearSelectedImage();
    setEditingProductId(product.product_id);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: String(product.price ?? 0),
      type: product.type ?? "",
      cover_image: product.coverImageUrl ?? "",
      capacity: product.capacity ?? "",
      provider_policy: product.provider_policy ?? "",
      quantity: String(product.quantity ?? 0),
    });
  }

  function resetForm() {
    setEditingProductId("");
    setForm(emptyProduct());
    clearSelectedImage();
  }

  function clearProductFilter() {
    setPinnedProductId("");
    setSearchQuery("");
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (isSaving()) return;
    setErrorMessage("");
    setSuccessMessage("");

    const current = form();
    const price = Number(current.price);
    const quantity = Number(current.quantity);
    const capacity = current.capacity.trim() === "" ? null : Number(current.capacity);
    if (!current.name.trim()) {
      setErrorMessage("Enter a product name.");
      return;
    }
    if (!current.type.trim()) {
      setErrorMessage("Enter a product type.");
      return;
    }
    if (!current.price.trim() || !Number.isFinite(price) || price < 0) {
      setErrorMessage("Enter a valid, non-negative price.");
      return;
    }
    if (!current.quantity.trim() || !Number.isSafeInteger(quantity) || quantity < 0) {
      setErrorMessage("Quantity must be a non-negative whole number.");
      return;
    }
    if (capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 0)) {
      setErrorMessage("Capacity must be a non-negative whole number.");
      return;
    }

    const image = selectedImage();
    if (image && (!imageExtension(image) || image.size > 5 * 1024 * 1024)) {
      setErrorMessage("Choose a PNG, JPEG, or WebP cover image no larger than 5 MB.");
      return;
    }

    setIsSaving(true);
    const wasEditing = Boolean(editingProductId());
    try {
      const productId = editingProductId() || crypto.randomUUID();
      if (image) {
        const extension = imageExtension(image);
        const storagePath = `${providerId()}/products/${productId}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(providerStorageBucket)
          .upload(storagePath, image, { contentType: image.type, upsert: true });
        if (uploadError) throw uploadError;
      }

      const productData = {
        product_id: productId,
        provider_id: providerId(),
        name: current.name.trim(),
        description: current.description.trim(),
        price,
        type: current.type.trim(),
        capacity,
        provider_policy: current.provider_policy.trim() || null,
        quantity,
      };

      if (editingProductId()) {
        const { data, error } = await supabase
          .from("products")
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq("product_id", editingProductId())
          .eq("provider_id", providerId())
          .select("entry_id, created_at, updated_at, product_id, provider_id, name, description, price, type, capacity, provider_policy, quantity, rating, ingredients")
          .single();
        if (error) throw error;
        const updatedProduct = {
          ...data,
          coverImageUrl: image
            ? await getProductCoverUrl(data.provider_id, data.product_id)
            : products().find((product) => product.product_id === data.product_id)?.coverImageUrl ?? "",
        };
        setProducts((currentProducts) => currentProducts.map((product) =>
          product.product_id === data.product_id ? updatedProduct : product,
        ));
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select("entry_id, created_at, updated_at, product_id, provider_id, name, description, price, type, capacity, provider_policy, quantity, rating, ingredients")
          .single();
        if (error) throw error;
        const createdProduct = {
          ...data,
          coverImageUrl: image ? await getProductCoverUrl(data.provider_id, data.product_id) : "",
        };
        setProducts((currentProducts) => [createdProduct, ...currentProducts]);
      }

      resetForm();
      setSuccessMessage(`${wasEditing ? "Product updated." : "Product added."}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? `Unable to save product: ${error.message}` : "Unable to save product.");
    } finally {
      setIsSaving(false);
    }
  }

  function requestProductDelete(product) {
    setDeleteError("");
    setProductPendingDelete(product);
  }

  function cancelProductDelete() {
    if (isDeleting()) return;
    setProductPendingDelete(null);
    setDeleteError("");
  }

  async function deleteProduct() {
    const product = productPendingDelete();
    if (!product || isDeleting()) return;
    setIsDeleting(true);
    setDeleteError("");
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("product_id", product.product_id)
        .eq("provider_id", providerId());
      if (error) throw error;
      setProducts((current) => current.filter((entry) => entry.product_id !== product.product_id));
      if (editingProductId() === product.product_id) resetForm();
      setProductPendingDelete(null);
      setSuccessMessage("Product deleted.");
    } catch (error) {
      setDeleteError(error instanceof Error ? `Unable to delete product: ${error.message}` : "Unable to delete product.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-360">
        <ProviderSignupBanner />
        <BrandBanner
          eyebrow="Provider workspace"
          title="Inventory."
          description="Manage the products linked to your provider workspace."
        />

        <Show when={errorMessage()}>
          <p role="alert" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>
        <Show when={successMessage()}>
          <p role="status" class="mt-5 rounded-xl border border-fern-700 bg-fern-900 px-4 py-3 text-sm text-fern-200">{successMessage()}</p>
        </Show>

        <Show when={productPendingDelete()}>
          {(product) => (
            <div
              class="fixed inset-0 z-[70] flex items-center justify-center bg-pine-teal-100/55 p-4 backdrop-blur-sm"
              role="presentation"
              onClick={(event) => {
                if (!isDeleting() && event.target === event.currentTarget) cancelProductDelete();
              }}
            >
              <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-product-title"
                aria-describedby="delete-product-description"
                class="w-full max-w-md rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-6 shadow-2xl"
              >
                <div class="flex items-start gap-4">
                  <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-950 text-rose-200">
                    <Show when={isDeleting()} fallback={<Trash2 size={20} aria-hidden="true" />}>
                      <LoaderCircle size={20} class="animate-spin" aria-hidden="true" />
                    </Show>
                  </span>
                  <div>
                    <h2 id="delete-product-title" class="font-serif text-xl text-dust-grey-100">
                      {isDeleting() ? "Deleting product…" : "Delete this product?"}
                    </h2>
                    <p id="delete-product-description" class="mt-2 text-sm leading-6 text-dust-grey-text">
                      {isDeleting()
                        ? "Please wait while this product is removed from your inventory."
                        : `“${product().name || "Untitled product"}” will be permanently removed from your inventory. This action cannot be undone.`}
                    </p>
                  </div>
                </div>
                <Show when={deleteError()}>
                  <p role="alert" class="mt-4 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{deleteError()}</p>
                </Show>
                <div class="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelProductDelete}
                    disabled={isDeleting()}
                    class="h-10 rounded-xl border border-dust-grey-600 px-4 text-sm font-semibold text-dust-grey-200 transition hover:bg-dust-grey-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Keep product
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteProduct()}
                    disabled={isDeleting()}
                    class="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Show when={isDeleting()} fallback={<Trash2 size={15} aria-hidden="true" />}>
                      <LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
                    </Show>
                    {isDeleting() ? "Deleting…" : "Delete product"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </Show>

        <Show when={editingProductId()}>
          <button type="button" onClick={resetForm} class="animate-product-drawer-backdrop-in motion-reduce:animate-none fixed inset-0 z-50 cursor-default bg-black/60" />
        </Show>
        <form
          onSubmit={saveProduct}
          role={editingProductId() ? "dialog" : undefined}
          aria-modal={editingProductId() ? "true" : undefined}
          aria-labelledby="product-form-title"
          class={editingProductId()
            ? "animate-product-drawer-in motion-reduce:animate-none fixed inset-y-0 right-0 z-60 w-full max-w-2xl overflow-y-auto border-y-0 border-r-0 rounded-none border-l border-dust-grey-600 bg-dust-grey-900 p-4 shadow-2xl sm:p-6"
            : "mt-6 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-4 sm:p-6"}
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="product-form-title" class="font-serif text-xl">{editingProductId() ? "Edit product" : "Add a product"}</h2>
              <p class="mt-1 text-xs text-dust-grey-text">Changes are saved to your provider’s Supabase inventory.</p>
            </div>
            <div class="flex items-center gap-2">
              <Show when={editingProductId()}>
                <button type="button" onClick={resetForm} class="inline-flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 px-3 text-sm font-semibold text-dust-grey-100 hover:bg-dry-sage-900">
                  <X size={15} aria-hidden="true" /> Cancel
                </button>
              </Show>
              <button type="submit" disabled={isSaving()} class="inline-flex h-10 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60">
                <Show when={editingProductId()} fallback={<Plus size={16} aria-hidden="true" />}>
                  <Pencil size={15} aria-hidden="true" />
                </Show>
                {isSaving() ? "Saving…" : editingProductId() ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
          <div class={editingProductId() ? "mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2" : "mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4"}>
            <label class="text-xs font-medium text-dust-grey-text">Product name *
              <input id="product-name" class={`${inputClass} mt-1`} value={form().name} onInput={(event) => updateForm("name", event.currentTarget.value)} maxLength="160" placeholder="e.g. Lakeview double room" aria-describedby="product-name-help" required />
              <span id="product-name-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">Use the name customers will see when browsing.</span>
            </label>
            <label class="text-xs font-medium text-dust-grey-text">Type *
              <input id="product-type" class={`${inputClass} mt-1`} value={form().type} onInput={(event) => updateForm("type", event.currentTarget.value)} maxLength="80" placeholder="e.g. Accommodation, dining, activity" aria-describedby="product-type-help" required />
              <span id="product-type-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">Choose a short category so customers can find it.</span>
            </label>
            <label class="text-xs font-medium text-dust-grey-text">Price per item (USD) *
              <input id="product-price" class={`${inputClass} mt-1`} type="number" min="0" step="0.01" inputmode="decimal" value={form().price} onInput={(event) => updateForm("price", event.currentTarget.value)} placeholder="e.g. 45.00" aria-describedby="product-price-help" required />
              <span id="product-price-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">Enter the amount charged for one item or unit.</span>
            </label>
            <label class="text-xs font-medium text-dust-grey-text">Quantity *
              <input id="product-quantity" class={`${inputClass} mt-1`} type="number" min="0" step="1" inputmode="numeric" value={form().quantity} onInput={(event) => updateForm("quantity", event.currentTarget.value)} placeholder="e.g. 8" aria-describedby="product-quantity-help" required />
              <span id="product-quantity-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">How many are available to order? Enter 0 if sold out.</span>
            </label>
            <label class="text-xs font-medium text-dust-grey-text">Capacity
              <input id="product-capacity" class={`${inputClass} mt-1`} type="number" min="0" step="1" inputmode="numeric" value={form().capacity} onInput={(event) => updateForm("capacity", event.currentTarget.value)} placeholder="e.g. 4" aria-describedby="product-capacity-help" />
              <span id="product-capacity-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">Optional: enter a non-negative whole-number guest limit or size.</span>
            </label>
            <label class={editingProductId() ? "text-xs font-medium text-dust-grey-text sm:col-span-2" : "text-xs font-medium text-dust-grey-text sm:col-span-1 lg:col-span-2"}>Cover image
              <span class="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-200">
                <ImagePlus size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"

                  onChange={(event) => selectImage(event.currentTarget.files?.[0] ?? null)}
                  class="min-w-0 flex-1 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-dry-sage-900 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-hunter-green-500"
                />
              </span>
              <span class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">{selectedImage()?.name ?? (form().cover_image ? "Current image will stay unless you choose a replacement." : "Choose a clear photo customers can recognize. PNG, JPEG, or WebP, up to 5 MB.")}</span>
              <Show when={selectedImagePreview() || form().cover_image}>
                <img
                  src={selectedImagePreview() || form().cover_image}
                  alt={selectedImagePreview() ? "Selected product cover preview" : "Current product cover"}
                  class="mt-3 h-36 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-800 object-cover sm:max-w-xs"
                width="800" height="144" />
              </Show>
            </label>
            <label class={editingProductId() ? "text-xs font-medium text-dust-grey-text sm:col-span-2" : "text-xs font-medium text-dust-grey-text sm:col-span-2 lg:col-span-4"}>Description
              <textarea id="product-description" class={`${textAreaClass} mt-1 min-h-24`} value={form().description} onInput={(event) => updateForm("description", event.currentTarget.value)} maxLength="3000" rows="3" placeholder="Describe what customers get, what makes it useful, and any details they should know." aria-describedby="product-description-help" />
              <span id="product-description-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">Optional, but helpful: include key features, what is included, or when it is available.</span>
            </label>
            <label class={editingProductId() ? "text-xs font-medium text-dust-grey-text sm:col-span-2" : "text-xs font-medium text-dust-grey-text sm:col-span-2 lg:col-span-4"}>Provider policy
              <textarea id="product-policy" class={`${textAreaClass} mt-1 min-h-24`} value={form().provider_policy} onInput={(event) => updateForm("provider_policy", event.currentTarget.value)} maxLength="3000" rows="3" placeholder="e.g. Please arrive 15 minutes early. Cancellations are accepted up to 24 hours before the booking." aria-describedby="product-policy-help" />
              <span id="product-policy-help" class="mt-1.5 block text-[11px] leading-4 text-dust-grey-400">Optional: explain booking, arrival, cancellation, or refund terms before customers order.</span>
            </label>
          </div>
        </form>

        <section class="mt-6 overflow-hidden rounded-3xl border border-dust-grey-600 bg-dust-grey-900">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-dust-grey-700 px-4 py-4 sm:px-6">
            <div>
              <h2 class="font-serif text-xl">{pinnedProductId() ? "Selected product" : "Your products"}</h2>
              <p class="mt-1 text-xs text-dust-grey-text">
                Showing {filteredProducts().length} of {products().length} product{products().length === 1 ? "" : "s"}
              </p>
            </div>
            <div class="flex w-full flex-wrap gap-2 sm:w-auto">
              <Show when={pinnedProductId()}>
                <button type="button" onClick={clearProductFilter} class="h-10 rounded-lg border border-dust-grey-600 px-3 text-xs font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900">
                  Show all products
                </button>
              </Show>
              <label class="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-dust-grey-600 bg-dust-grey-900 px-3 sm:w-64">
                <Search size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
                <input type="search" value={searchQuery()} onInput={(event) => setSearchQuery(event.currentTarget.value)} placeholder="Search products" class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text" />
              </label>
            </div>
          </div>
          <Show when={isLoading()}><p role="status" class="px-6 py-8 text-center text-sm text-dust-grey-text">Loading inventory…</p></Show>
          <Show when={!isLoading() && filteredProducts().length > 0} fallback={<Show when={!isLoading()}><p class="px-6 py-10 text-center text-sm text-dust-grey-text">{products().length ? "No products match your search or selected calendar item." : "No products are linked to this provider yet."}</p></Show>}>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[760px] text-left text-sm">
                  <thead class="bg-dry-sage-900 text-xs uppercase tracking-wide text-dust-grey-text">
                    <tr>
                      <th scope="col" class="px-4 py-3 font-semibold sm:px-6">Product</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Type</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Price</th>
                      <th scope="col" class="px-4 py-3 font-semibold">Quantity</th>
                      <th scope="col" class="px-4 py-3 text-right font-semibold sm:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-dust-grey-700">
                    <For each={filteredProducts()}>
                      {(product) => (
                        <tr class="text-dust-grey-100">
                          <td class="px-4 py-4 sm:px-6">
                            <div class="flex min-w-56 items-center gap-3">
                              <Show when={product.coverImageUrl} fallback={<span class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-dry-sage-900 text-hunter-green-500"><ImagePlus size={18} aria-hidden="true" /></span>}>
                                <img src={product.coverImageUrl} alt="" class="size-11 shrink-0 rounded-lg bg-dry-sage-900 object-cover" loading="lazy" width="44" height="44" />
                              </Show>
                              <div class="min-w-0">
                                <p class="truncate font-semibold">{product.name || "Untitled product"}</p>
                                <p class="mt-1 max-w-xs truncate text-xs text-dust-grey-text">{product.description || product.capacity || "No description"}</p>
                              </div>
                            </div>
                          </td>
                          <td class="px-4 py-4"><span class="rounded-full bg-dry-sage-900 px-2.5 py-1 text-xs font-medium text-hunter-green-500">{product.type || "Uncategorized"}</span></td>
                          <td class="px-4 py-4 tabular-nums">{formatPrice(product.price)}</td>
                          <td class="px-4 py-4 tabular-nums">{product.quantity}</td>
                          <td class="px-4 py-4 sm:px-6">
                            <div class="flex justify-end gap-2">
                              <button type="button" onClick={() => beginEdit(product)} class="inline-flex size-9 items-center justify-center rounded-lg border border-dust-grey-600 text-hunter-green-500 transition hover:bg-dry-sage-900"><Pencil size={16} aria-hidden="true" /></button>
                              <button type="button" onClick={() => requestProductDelete(product)} class="inline-flex size-9 items-center justify-center rounded-lg border border-hunter-green-500 bg-hunter-green-500 text-white transition hover:border-hunter-green-400 hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"><Trash2 size={16} aria-hidden="true" /></button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
          </Show>
        </section>
      </div>
    </main>
  );
}
