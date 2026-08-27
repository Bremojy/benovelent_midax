import API from "./api";
let cache = null;
let loading = null;
export async function getRuntimeConfig({ force = false } = {}) {
  if (cache && !force) return cache;
  if (loading && !force) return loading;
  loading = Promise.allSettled([API.get("/payments/public-config"), API.get("/platform/runtime-config")]).then(([a,b]) => {
    const mpesa = a.status === "fulfilled" ? (a.value?.data || {}) : {};
    const platform = b.status === "fulfilled" ? (b.value?.data || {}) : {};
    cache = { ...platform, mpesa: { ...(platform.mpesa || {}), ...(mpesa || {}) } };
    return cache;
  }).finally(() => { loading = null; });
  return loading;
}
