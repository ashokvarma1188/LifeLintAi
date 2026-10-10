import api from "./api";

export async function getDonationCertificate() {
  const { data } = await api.post("/certificates/donation");
  return data.certificate;
}

/** Public: checks a certificate code (no login needed). */
export async function verifyCertificate(code) {
  const { data } = await api.get(`/public/certificates/${encodeURIComponent(code)}`);
  return data.certificate;
}
