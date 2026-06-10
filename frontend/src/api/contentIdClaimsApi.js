import api from "./api";

export async function listContentIdClaimCmsAccounts() {
  const response = await api.get("/content-id/cms-networks");
  return (response.data.networks || []).map((network) => ({
    id: network.id,
    cms_name: network.name,
    google_email: network.cms_auth_email,
    status: network.cms_auth_status,
    scopes: network.cms_auth_scopes || ""
  }));
}

export async function searchContentIdClaims(payload) {
  const response = await api.post("/content-id/claims/search", payload, { timeout: 90000 });
  return response.data.data;
}

export async function releaseContentIdClaims(releases) {
  const response = await api.post("/content-id/claims/release", { releases }, { timeout: 180000 });
  return response.data.data;
}
