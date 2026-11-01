import { createSignal, For, onMount, Show } from "solid-js";
import { AlertCircle, ArrowDownUp, ChevronLeft, ChevronRight, MessageSquareText, RefreshCw, Search, Star, UserRound } from "lucide-solid";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";
import { getUserAvatarUrl, supabase } from "~/utils/supabase";
import { getCurrentProvider } from "~/utils/provider-data";

const pageSize = 20;
const ratingFilters = [
  { value: "all", label: "All ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
];

function formatReviewDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function reviewProductName(product) {
  const joinedProduct = Array.isArray(product.products) ? product.products[0] : product.products;
  return joinedProduct?.name?.trim() || `Product ${product.product_id}`;
}

function latestReplyByReviewId(replyRows) {
  const latestReplies = new Map();
  for (const reply of replyRows) {
    const current = latestReplies.get(reply.review_id);
    if (!current || new Date(reply.updated_at) > new Date(current.updated_at)) {
      latestReplies.set(reply.review_id, reply);
    }
  }
  return latestReplies;
}

function ReviewAvatar(props) {
  const [imageFailed, setImageFailed] = createSignal(false);
  const initials = () => props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "C";

  return (
    <div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dry-sage-800 text-sm font-semibold text-hunter-green-500">
      <Show when={props.image && !imageFailed()} fallback={<span aria-hidden="true">{initials()}</span>}>
        <img
          src={props.image}
          alt=""
          class="size-full object-cover"
          loading="lazy"
          width="800"
          height="600"
          onError={() => setImageFailed(true)}
        />
      </Show>
    </div>
  );
}

function ReviewCard(props) {
  const rating = () => Number(props.review.rating);
  const filledStars = () => Math.min(5, Math.max(0, Math.round(rating())));
  const savedReply = () => props.reply();

  return (
    <article class="rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <ReviewAvatar name={props.author.name} image={props.author.image} />
          <div class="min-w-0">
            <h2 class="truncate text-sm font-semibold text-dust-grey-100">{props.author.name}</h2>
            <p class="mt-1 text-xs text-dust-grey-text">{formatReviewDate(props.review.created_at)}</p>
          </div>
        </div>
        <div class="flex items-center gap-2" aria-label={`Rating ${rating()} out of 5`}>
          <span class="flex items-center gap-0.5 text-amber-500" aria-hidden="true">
            <For each={Array.from({ length: 5 })}>{(_, index) => (
              <Star
                size={15}
                fill={index() < filledStars() ? "currentColor" : "none"}
                class={index() < filledStars() ? "" : "text-dust-grey-400"}
              />
            )}</For>
          </span>
          <span class="text-sm font-semibold tabular-nums text-dust-grey-100">
            {Number.isFinite(rating()) ? rating().toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
            <span class="font-normal text-dust-grey-text"> / 5</span>
          </span>
        </div>
      </div>
      <p class="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-dust-grey-200">
        {props.review.description}
      </p>
      <div class="mt-5 flex items-center gap-2 border-t border-dust-grey-600 pt-4 text-xs text-dust-grey-text">
        <MessageSquareText size={14} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
        <span class="min-w-0 truncate" title={props.productName}>{props.productName}</span>
      </div>
      <Show when={savedReply()}>
        <div class="mt-4 rounded-2xl border border-hunter-green-500/20 bg-hunter-green-500/5 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs font-semibold text-hunter-green-500">Provider reply</p>
            <p class="text-[11px] text-dust-grey-text">{formatReviewDate(savedReply().updated_at)}</p>
          </div>
          <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-dust-grey-200">{savedReply().description}</p>
        </div>
      </Show>
      <form class="mt-4" onSubmit={(event) => {
        event.preventDefault();
        props.onSaveReply(props.review.entry_id);
      }}>
        <label class="block text-xs font-medium text-dust-grey-text">
          {savedReply() ? "Edit your reply" : "Write a reply"}
          <textarea
            rows="3"
            maxlength="1000"
            required
            value={props.replyDraft()}
            onInput={(event) => props.onReplyDraft(props.review.entry_id, event.currentTarget.value)}
            placeholder="Thank the customer or respond thoughtfully to their feedback…"
            class="mt-2 w-full resize-y rounded-xl border border-dust-grey-600 bg-dust-grey-800 px-3 py-2.5 text-sm leading-5 text-dust-grey-100 outline-none transition placeholder:text-dust-grey-400 focus:border-hunter-green-500 focus:ring-2 focus:ring-hunter-green-500/15"
          />
        </label>
        <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p class="text-[11px] text-dust-grey-400">Your reply will be saved with this review.</p>
          <button
            type="submit"
            disabled={!props.replyDraft().trim() || props.saving()}
            class="inline-flex h-9 items-center gap-2 rounded-xl bg-hunter-green-500 px-3 text-xs font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageSquareText size={14} aria-hidden="true" />
            {props.saving() ? "Saving…" : savedReply() ? "Update reply" : "Save reply"}
          </button>
        </div>
      </form>
    </article>
  );
}

export default function ProviderReviewsPage() {
  const [reviews, setReviews] = createSignal([]);
  const [authors, setAuthors] = createSignal({});
  const [page, setPage] = createSignal(0);
  const [ratingFilter, setRatingFilter] = createSignal("all");
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sortOrder, setSortOrder] = createSignal("newest");
  const [totalCount, setTotalCount] = createSignal(0);
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [profileWarning, setProfileWarning] = createSignal("");
  const [providerAvatar, setProviderAvatar] = createSignal("");
  const [providerAvatarFailed, setProviderAvatarFailed] = createSignal(false);
  const [replies, setReplies] = createSignal({});
  const [replyDrafts, setReplyDrafts] = createSignal({});
  const [savingReplyId, setSavingReplyId] = createSignal("");
  const [replyError, setReplyError] = createSignal("");
  let requestVersion = 0;

  async function loadReviews() {
    const version = ++requestVersion;
    setLoading(true);
    setErrorMessage("");
    setProfileWarning("");

    try {
      const { user, providerId: currentProviderId } = await getCurrentProvider();
      setProviderAvatarFailed(false);
      setProviderAvatar(await getUserAvatarUrl(user.id));
      if (version !== requestVersion) return;

      let query = supabase
        .from("reviews")
        .select("entry_id, review_id, created_at, user_id, product_id, description, rating, products(name)", { count: "exact" })
        .eq("provider_id", currentProviderId)
        .order("created_at", { ascending: false })
        .range(page() * pageSize, (page() + 1) * pageSize - 1);
      if (ratingFilter() !== "all") {
        const minimum = Number(ratingFilter());
        query = query.gte("rating", minimum).lt("rating", minimum + 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      if (version !== requestVersion) return;

      const pageReviews = data ?? [];
      setReviews(pageReviews);
      setTotalCount(count ?? 0);
      const reviewIds = [...new Set(pageReviews.map((review) => review.review_id).filter(Boolean))];
      let reviewReplies = {};
      if (reviewIds.length) {
        const { data: replyRows, error: repliesError } = await supabase
          .from("replies")
          .select("entry_id, review_id, created_at, updated_at, description")
          .in("review_id", reviewIds)
          .order("updated_at", { ascending: false });
        if (repliesError) throw repliesError;
        const latestReplies = latestReplyByReviewId(replyRows ?? []);
        reviewReplies = Object.fromEntries(pageReviews
          .map((review) => [review.entry_id, latestReplies.get(review.review_id) ?? null])
          .filter(([, reply]) => reply));
      }
      setReplies(reviewReplies);
      setReplyDrafts(Object.fromEntries(
        Object.entries(reviewReplies).map(([reviewEntryId, reply]) => [reviewEntryId, reply.description]),
      ));

      const userIds = [...new Set(pageReviews.map((review) => review.user_id).filter(Boolean))];
      if (!userIds.length) {
        setAuthors({});
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);
      if (version !== requestVersion) return;
      if (profileError) {
        setProfileWarning(`Client profile details could not be loaded: ${profileError.message}`);
      }

      const profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      const avatars = await Promise.all(userIds.map(async (userId) => [
        userId,
        await getUserAvatarUrl(userId),
      ]));
      if (version !== requestVersion) return;

      const avatarsByUserId = new Map(avatars);
      const authorsByUserId = Object.fromEntries(userIds.map((userId) => {
        const profile = profilesByUserId.get(userId);
        return [userId, {
          name: profile?.name?.trim() || "Customer",
          image: avatarsByUserId.get(userId) || "",
        }];
      }));
      setAuthors(authorsByUserId);
      if (!profileError && userIds.some((userId) => !profilesByUserId.has(userId))) {
        setProfileWarning("Some customer profiles are unavailable.");
      }
    } catch (error) {
      if (version !== requestVersion) return;
      setReviews([]);
      setAuthors({});
      setTotalCount(0);
      setReplies({});
      setErrorMessage(error instanceof Error ? error.message : "Unable to load reviews.");
    } finally {
      if (version === requestVersion) setLoading(false);
    }
  }

  onMount(() => void loadReviews());

  function updateReplyDraft(reviewId, value) {
    setReplyDrafts((current) => ({ ...current, [reviewId]: value }));
  }

  async function saveReply(reviewId) {
    const text = (replyDrafts()[reviewId] ?? "").trim();
    if (!text || text.length > 1000) return;
    const review = reviews().find((item) => item.entry_id === reviewId);
    if (!review) return;
    setSavingReplyId(reviewId);
    setReplyError("");
    try {
      const reviewKey = review.review_id;
      if (!reviewKey) throw new Error("This review is missing its review_id.");
      const existingReply = replies()[reviewId];
      const replyValues = {
        review_id: reviewKey,
        description: text,
        updated_at: new Date().toISOString(),
      };
      let savedReply;
      if (existingReply?.entry_id) {
        const { data, error } = await supabase
          .from("replies")
          .update(replyValues)
          .eq("entry_id", existingReply.entry_id)
          .eq("review_id", reviewKey)
          .select("entry_id, review_id, created_at, updated_at, description")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("The reply could not be updated. Check reply update permissions.");
        savedReply = data;
      } else {
        const { data, error } = await supabase
          .from("replies")
          .insert(replyValues)
          .select("entry_id, review_id, created_at, updated_at, description")
          .single();
        if (error) throw error;
        savedReply = data;
      }
      setReplies((current) => ({ ...current, [reviewId]: savedReply }));
      setReplyDrafts((current) => ({ ...current, [reviewId]: savedReply.description }));
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Unable to save the provider reply.");
    } finally {
      setSavingReplyId("");
    }
  }

  function changeRatingFilter(event) {
    setRatingFilter(event.currentTarget.value);
    setPage(0);
    void loadReviews();
  }

  function changePage(nextPage) {
    setPage(nextPage);
    void loadReviews();
  }

  const pageCount = () => Math.ceil(totalCount() / pageSize);
  const visibleReviews = () => {
    const query = searchQuery().trim().toLocaleLowerCase();
    const filtered = reviews().filter((review) => {
      if (!query) return true;
      const author = authors()[review.user_id]?.name ?? review.author?.name ?? "Customer";
      const productName = reviewProductName(review);
      const reply = replies()[review.entry_id]?.description ?? "";
      return [review.description, author, productName, reply]
        .some((value) => String(value).toLocaleLowerCase().includes(query));
    });

    return filtered.sort((first, second) => {
      if (sortOrder() === "oldest") return new Date(first.created_at) - new Date(second.created_at);
      if (sortOrder() === "highest_rating") return Number(second.rating) - Number(first.rating);
      if (sortOrder() === "lowest_rating") return Number(first.rating) - Number(second.rating);
      return new Date(second.created_at) - new Date(first.created_at);
    });
  };

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-12 pt-7 text-dust-grey-100 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-275">
        <ProviderSignupBanner />
        <header class="relative overflow-hidden rounded-7 border border-hunter-green-400 bg-linear-to-br from-hunter-green-500 via-pine-teal-500 to-fern-500 p-5 text-white shadow-sm sm:p-7 lg:p-8">
          <div aria-hidden="true" class="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-white/15" />
          <div class="relative flex flex-wrap items-end justify-between gap-5">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Provider feedback</p>
              <h1 class="mt-1 font-serif text-3xl tracking-[-0.04em] sm:text-[38px]">Reviews &amp; feedback</h1>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-white/85">
                Read customer ratings and comments on your products.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/15 text-white">
                <Show when={providerAvatar() && !providerAvatarFailed()} fallback={<UserRound size={20} aria-hidden="true" />}>
                  <img
                    src={providerAvatar()}
                    alt="Provider profile"
                    class="size-full object-cover"
                    width="800"
                    height="600"
                    onError={() => setProviderAvatarFailed(true)}
                  />
                </Show>
              </span>
              <div class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/90">
                <MessageSquareText size={15} aria-hidden="true" />
                <span>{totalCount().toLocaleString()} {totalCount() === 1 ? "review" : "reviews"}</span>
              </div>
            </div>
          </div>
        </header>

        <section aria-label="Review filters" class="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-dust-grey-600 bg-dry-sage-900 p-4">
          <label class="grid min-w-56 flex-1 gap-1 text-xs font-medium text-dust-grey-text">
            <span>Search this page</span>
            <span class="flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 focus-within:border-hunter-green-500 focus-within:ring-2 focus-within:ring-hunter-green-500/15">
              <Search size={16} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search reviews on this page"
                value={searchQuery()}
                onInput={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Search comments, customers, products"
                class="min-w-0 flex-1 bg-transparent text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-400"
              />
            </span>
          </label>
          <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
            <span>Rating</span>
            <select
              aria-label="Filter reviews by rating"
              class="h-10 min-w-40 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 text-sm text-dust-grey-100 outline-none transition focus:border-hunter-green-500 focus:ring-2 focus:ring-hunter-green-500/15"
              value={ratingFilter()}
              onChange={changeRatingFilter}
            >
              <For each={ratingFilters}>{(filter) => <option value={filter.value}>{filter.label}</option>}</For>
            </select>
          </label>
          <label class="grid gap-1 text-xs font-medium text-dust-grey-text">
            <span>Sort this page</span>
            <span class="flex h-10 items-center gap-2 rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-3 focus-within:border-hunter-green-500 focus-within:ring-2 focus-within:ring-hunter-green-500/15">
              <ArrowDownUp size={15} class="shrink-0 text-hunter-green-500" aria-hidden="true" />
              <select
                aria-label="Sort reviews"
                value={sortOrder()}
                onChange={(event) => setSortOrder(event.currentTarget.value)}
                class="min-w-36 bg-transparent text-sm text-dust-grey-100 outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest_rating">Highest rating</option>
                <option value="lowest_rating">Lowest rating</option>
              </select>
            </span>
          </label>
          <button
            type="button"
            onClick={() => void loadReviews()}
            disabled={loading()}
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw size={15} class={loading() ? "animate-spin" : ""} aria-hidden="true" />
            {loading() ? "Refreshing" : "Refresh"}
          </button>
        </section>

        <Show when={profileWarning()}>
          <p role="status" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-dust-grey-200">
            {profileWarning()} Names and photos will use a fallback where unavailable.
          </p>
        </Show>
        <Show when={replyError()}>
          <p role="alert" class="mt-3 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            {replyError()}
          </p>
        </Show>

        <Show when={errorMessage()}>
          <div role="alert" class="mt-5 rounded-2xl border border-rose-400/40 bg-rose-50 px-4 py-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            <div class="flex items-start gap-3">
              <AlertCircle size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold">Reviews could not be loaded.</p>
                <p class="mt-1 break-words">{errorMessage()}</p>
              </div>
              <button type="button" onClick={() => void loadReviews()} class="shrink-0 font-semibold underline underline-offset-2">
                Try again
              </button>
            </div>
          </div>
        </Show>

        <Show when={loading() && reviews().length === 0}>
          <div aria-label="Loading reviews" aria-busy="true" class="mt-5 grid gap-4">
            <For each={Array.from({ length: 3 })}>{() => (
              <div class="h-44 animate-pulse rounded-3xl border border-dust-grey-600 bg-dry-sage-900" />
            )}</For>
          </div>
        </Show>

        <Show when={!loading() && !errorMessage() && reviews().length === 0}>
          <section class="mt-5 rounded-3xl border border-dashed border-dust-grey-600 bg-dry-sage-900 px-5 py-14 text-center">
            <span class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500/10 text-hunter-green-500">
              <MessageSquareText size={22} aria-hidden="true" />
            </span>
            <h2 class="mt-4 font-serif text-xl text-dust-grey-100">No reviews found</h2>
            <p class="mt-2 text-sm text-dust-grey-text">
              {ratingFilter() === "all" ? "Customer reviews will appear here when they are available." : "Try selecting a different rating."}
            </p>
          </section>
        </Show>

        <Show when={reviews().length > 0}>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-dust-grey-text">
              {visibleReviews().length} matching {visibleReviews().length === 1 ? "review" : "reviews"} on this page · {totalCount().toLocaleString()} total
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous reviews"
                disabled={page() === 0 || loading()}
                onClick={() => changePage(page() - 1)}
                class="flex size-9 items-center justify-center rounded-xl border border-dust-grey-600 text-dust-grey-200 transition hover:bg-dust-grey-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <span class="min-w-16 text-center text-xs tabular-nums text-dust-grey-text">
                {page() + 1} / {Math.max(1, pageCount())}
              </span>
              <button
                type="button"
                aria-label="Next reviews"
                disabled={page() + 1 >= pageCount() || loading()}
                onClick={() => changePage(page() + 1)}
                class="flex size-9 items-center justify-center rounded-xl border border-dust-grey-600 text-dust-grey-200 transition hover:bg-dust-grey-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
          <Show
            when={visibleReviews().length > 0}
            fallback={
              <p role="status" class="mt-3 rounded-xl border border-dashed border-dust-grey-600 bg-dry-sage-900 px-4 py-8 text-center text-sm text-dust-grey-text">
                No reviews on this page match your search.
              </p>
            }
          >
            <div class="mt-3 grid gap-4">
              <For each={visibleReviews()}>{(review) => (
                <ReviewCard
                  review={review}
                  author={authors()[review.user_id] ?? review.author ?? { name: "Customer", image: "" }}
                  productName={reviewProductName(review)}
                  reply={() => replies()[review.entry_id] ?? null}
                  replyDraft={() => replyDrafts()[review.entry_id] ?? ""}
                  saving={() => savingReplyId() === review.entry_id}
                  onReplyDraft={updateReplyDraft}
                  onSaveReply={saveReply}
                />
              )}</For>
            </div>
          </Show>
        </Show>
      </div>
    </main>
  );
}
