const crypto = require("crypto");
const Certificate = require("../models/Certificate");

// No 0/O or 1/I, so a code read off paper can't be mistyped.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => {
  const bytes = crypto.randomBytes(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `LL-${chars.slice(0, 4)}-${chars.slice(4)}`;
};

const createWithCode = async (fields) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Certificate.create({ ...fields, code: makeCode() });
    } catch (err) {
      if (err.code !== 11000) throw err; // a clash on the unique code: try another
    }
  }
  throw new Error("Could not create a certificate code");
};

/** One first-aid certificate per person; a better score later updates it. */
const issueFirstAid = async (user, score, total) => {
  const existing = await Certificate.findOne({ userId: user._id, kind: "first_aid" });
  const detail = `Passed the LifeLink first-aid course with ${score}/${total}`;
  if (existing) {
    if (score > (existing.meta?.score || 0)) {
      existing.meta = { score, total };
      existing.detail = detail;
      existing.recipientName = user.name;
      await existing.save();
    }
    return existing;
  }
  return createWithCode({
    userId: user._id, kind: "first_aid", recipientName: user.name, title: "First-Aid Aware", detail, meta: { score, total },
  });
};

/** One certificate per donation (the donor's latest one). */
const issueDonation = async (user) => {
  const donationNumber = user.donationCount || 0;
  const existing = await Certificate.findOne({ userId: user._id, kind: "blood_donation", "meta.donationNumber": donationNumber });
  if (existing) return existing;
  return createWithCode({
    userId: user._id,
    kind: "blood_donation",
    recipientName: user.name,
    title: "Blood Donor",
    detail: `Donated blood${user.lastDonationPlace ? ` at ${user.lastDonationPlace}` : ""} — donation #${donationNumber}`,
    meta: { donationNumber, donatedAt: user.lastDonatedAt, place: user.lastDonationPlace || "", bloodGroup: user.bloodGroup || "" },
  });
};

/** What a certificate looks like to its owner, and on the public verify page. */
const publicView = (certificate) => ({
  code: certificate.code,
  kind: certificate.kind,
  title: certificate.title,
  recipientName: certificate.recipientName,
  detail: certificate.detail,
  meta: certificate.meta,
  issuedAt: certificate.issuedAt,
});

module.exports = { makeCode, issueFirstAid, issueDonation, publicView };
