import { supabase } from "~/utils/supabase-client";

export async function getCurrentProvider() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in to access your provider workspace.");

  const { data: membership, error: membershipError } = await supabase
    .from("provider_members")
    .select("provider_id, member_id, name, role, phone")
    .eq("member_id", authData.user.id)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.provider_id) {
    throw new Error("Your account is not linked to a provider workspace.");
  }

  return { user: authData.user, membership, providerId: membership.provider_id };
}

export async function getProviderProducts(providerId) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("entry_id, created_at, updated_at, product_id, provider_id, name, description, price, type, capacity, provider_policy, quantity, rating, ingredients")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

export async function getProviderRecords(providerId) {
  const products = await getProviderProducts(providerId);
  const productIds = products.map((product) => product.product_id);
  if (!productIds.length) return { products, records: [] };

  async function fetchRecords(table, type) {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select("entry_id, created_at, updated_at, status, client_id, product_id, period, quantity, arrival_time")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...(data ?? []).map((record) => ({ ...record, type })));
      if ((data ?? []).length < 1000) return rows;
    }
  }
  const [orders, bookings] = await Promise.all([
    fetchRecords("orders", "order"),
    fetchRecords("bookings", "booking"),
  ]);

  return {
    products,
    records: [...orders, ...bookings].sort((first, second) => new Date(second.created_at) - new Date(first.created_at)),
  };
}
