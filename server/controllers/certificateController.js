const Certificate = require("../models/Certificate");
const { issueDonation, publicView } = require("../utils/certificates");

const CODE_PATTERN = /^LL-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** The certificate for the person's latest blood donation (created the first time it's asked for). */
const getDonationCertificate = async (req, res) => {
  try {
    if (!req.user.donationCount) return res.status(400).json({ message: "Record a donation first to get your certificate." });
    res.json({ certificate: publicView(await issueDonation(req.user)) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const listMine = async (req, res) => {
  try {
    const certificates = await Certificate.find({ userId: req.userId }).sort({ issuedAt: -1 }).lean();
    res.json({ certificates: certificates.map(publicView) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Public: anyone holding a certificate's code (printed and in its QR code) can check it's real. */
const verifyCertificate = async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return res.status(404).json({ message: "Certificate not found" });
    const certificate = await Certificate.findOne({ code }).lean();
    if (!certificate) return res.status(404).json({ message: "Certificate not found" });
    const view = publicView(certificate);
    // The public page shows the name, title and date. The blood group stays private.
    if (view.meta) view.meta = { ...view.meta, bloodGroup: undefined };
    res.json({ certificate: view });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getDonationCertificate, listMine, verifyCertificate };
