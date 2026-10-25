import { A } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Trash2 } from "lucide-solid";

const draftKey = "bakimono-provider-signup-draft";
const maxPhotos = 5;
const maxGalleryBytes = 600 * 1024;
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Unable to read ${file.name}.`));
        return;
      }
      resolve({ name: file.name, type: file.type, data: reader.result });
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function ProviderGalleryPage() {
  const [photos, setPhotos] = createSignal([]);
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isSaved, setIsSaved] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft);
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) return;
      setDraftAvailable(true);
      if (Array.isArray(draft.gallery)) setPhotos(draft.gallery);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your provider signup: ${error.message}`
          : "Unable to restore your provider signup.",
      );
    }
  });

  async function handlePhotoChange(event) {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    setErrorMessage("");

    if (!files.length) return;
    if (photos().length + files.length > maxPhotos) {
      setErrorMessage(`You can add up to ${maxPhotos} gallery photos.`);
      return;
    }
    if (files.some((file) => !supportedImageTypes.includes(file.type))) {
      setErrorMessage("Choose JPG, PNG, or WebP image files.");
      return;
    }
    if (files.some((file) => file.size === 0)) {
      setErrorMessage("One or more selected files are empty. Choose valid image files.");
      return;
    }
    if (photos().reduce((total, photo) => total + photo.bytes, 0) + files.reduce((total, file) => total + file.size, 0) > maxGalleryBytes) {
      setErrorMessage("The gallery is too large for a temporary signup draft. Choose smaller photos (600 KB total maximum).");
      return;
    }

    setIsProcessing(true);
    try {
      const newPhotos = await Promise.all(files.map(readImage));
      setPhotos((current) => [
        ...current,
        ...newPhotos.map((photo, index) => ({
          ...photo,
          bytes: files[index].size,
          id: `${files[index].name}-${files[index].lastModified}-${index}`,
        })),
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read the selected photos.");
    } finally {
      setIsProcessing(false);
    }
  }

  function removePhoto(id) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
    setErrorMessage("");
  }

  function persistGallery() {
    setErrorMessage("");
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your provider signup draft could not be found. Go back and complete step 1.");
        return;
      }
      const draft = JSON.parse(savedDraft);
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draft,
          gallery: photos(),
        }),
      );
      setIsSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save your gallery: ${error.message}`
          : "Unable to save your gallery.",
      );
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="/provider/signup/social"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to social links
        </A>

        <header class="mt-7 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">Provider onboarding · Step 3 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Show customers your space.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Add a few photos of your business, rooms, food, or experiences. This gallery is optional and you can continue without photos.
          </p>
          <div class="mt-6" aria-label="Signup progress">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-300">
              <span>Photo gallery</span>
              <span>60%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Provider signup progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="60"
              class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700"
            >
              <div class="h-full w-3/5 rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={!draftAvailable() && !errorMessage()}>
          <section class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete the previous steps first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-300">
              Save your provider details before adding gallery photos.
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
            when={!isSaved()}
            fallback={
              <section role="status" class="mt-6 rounded-[28px] border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
                <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
                  <Check size={22} aria-hidden="true" />
                </span>
                <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">
                  Gallery saved for this session.
                </h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                  Your provider draft now has {photos().length} gallery photo{photos().length === 1 ? "" : "s"}.
                </p>
                <div class="mt-5 flex flex-wrap gap-5">
                  <button
                    type="button"
                    onClick={() => setIsSaved(false)}
                    class="text-sm font-semibold text-hunter-green-500 hover:underline"
                  >
                    Edit gallery
                  </button>
                  <A
                    href="/provider/signup/verification"
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
                  >
                    Continue to verification <ArrowRight size={16} aria-hidden="true" />
                  </A>
                </div>
              </section>
            }
          >
            <form onSubmit={(event) => { event.preventDefault(); persistGallery(); }} class="mt-6 rounded-[28px] border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 class="font-serif text-2xl tracking-[-0.035em]">Business gallery <span class="text-sm font-sans font-normal text-dust-grey-300">(optional)</span></h2>
                  <p class="mt-1 text-sm text-dust-grey-300">Add up to {maxPhotos} JPG, PNG, or WebP photos.</p>
                </div>
                <label class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dry-sage-700 px-4 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900">
                  <ImagePlus size={17} aria-hidden="true" />
                  {isProcessing() ? "Reading photos…" : "Choose photos"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={isProcessing() || photos().length >= maxPhotos}
                    onChange={handlePhotoChange}
                    class="sr-only"
                  />
                </label>
              </div>

              <Show
                when={photos().length > 0}
                fallback={
                  <div class="mt-6 rounded-2xl border border-dashed border-dust-grey-600 bg-dust-grey-800 px-5 py-10 text-center">
                    <ImagePlus size={26} class="mx-auto text-dust-grey-300" aria-hidden="true" />
                    <p class="mt-3 text-sm font-medium text-dust-grey-200">No gallery photos added</p>
                    <p class="mt-1 text-xs text-dust-grey-300">You can skip this and continue.</p>
                  </div>
                }
              >
                <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <For each={photos()}>
                    {(photo) => (
                      <figure class="relative overflow-hidden rounded-2xl border border-dust-grey-600 bg-dust-grey-800">
                        <img src={photo.data} alt={photo.name} class="aspect-square w-full object-cover" />
                        <figcaption class="truncate px-3 py-2 text-xs text-dust-grey-300">{photo.name}</figcaption>
                        <button
                          type="button"
                          aria-label={`Remove ${photo.name}`}
                          onClick={() => removePhoto(photo.id)}
                          class="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-dust-grey-900/90 text-dust-grey-100 shadow transition hover:text-rose-600"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </figure>
                    )}
                  </For>
                </div>
              </Show>

              <p class="mt-4 text-xs leading-5 text-dust-grey-300">
                Temporary signup drafts support up to 600 KB of gallery photos in total.
              </p>
              <div class="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-dust-grey-700 pt-5 sm:flex-row sm:items-center">
                <p class="text-xs leading-5 text-dust-grey-300">Photos are optional; saving an empty gallery is fine.</p>
                <button
                  type="submit"
                  disabled={isProcessing()}
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
                >
                  Save and continue <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}
