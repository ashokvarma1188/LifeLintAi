/*
 * Blood donation camps. Hospitals post camps; civilians register for upcoming ones.
 * On the day, the hospital marks who actually donated, which records the donation
 * (90-day rest, badge count) and makes the donor's certificate available.
 */
const DonationCamp = require("../models/DonationCamp");
const Hospital = require("../models/Hospital");
const User = require("../models/User");
const { isCivilian } = require("../constants/roles");
const { nextEligibleDate } = require("./donorController");
const { sendToUsers } = require("../utils/push");
const { distanceKm, readPoint } = require("../utils/geo");

const HOUR_MS = 60 * 60 * 1000;

const campView = (camp, userId, here) => {
  const mine = camp.registrations.find((r) => String(r.userId) === String(userId));
  return {
    _id: camp._id,
    title: camp.title,
    description: camp.description || "",
    venue: camp.venue,
    organiserName: camp.organiserName,
    coordinates: camp.location.coordinates,
    startsAt: camp.startsAt,
    endsAt: camp.endsAt,
    capacity: camp.capacity,
    registeredCount: camp.registrations.length,
    isRegistered: Boolean(mine),
    donated: Boolean(mine?.donatedAt),
    distanceKm: here ? Math.round(distanceKm(here, camp.location.coordinates) * 10) / 10 : null,
  };
};

/** Upcoming and running camps, soonest first. */
const listCamps = async (req, res) => {
  try {
    const camps = await DonationCamp.find({ endsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(100).lean();
    const here = readPoint(req.query);
    res.json({ camps: camps.map((camp) => campView(camp, req.userId, here)) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const createCamp = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 120);
    const venue = String(req.body?.venue || "").trim().slice(0, 200);
    const description = String(req.body?.description || "").trim().slice(0, 600);
    const startsAt = new Date(req.body?.startsAt);
    const endsAt = new Date(req.body?.endsAt);
    const capacity = Math.round(Number(req.body?.capacity) || 100);

    if (!title || !venue) return res.status(400).json({ message: "A title and a venue are required." });
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return res.status(400).json({ message: "Choose when the camp starts and ends." });
    }
    if (startsAt < new Date(Date.now() - HOUR_MS)) return res.status(400).json({ message: "The camp must be in the future." });
    if (endsAt <= startsAt || endsAt - startsAt > 3 * 24 * HOUR_MS) {
      return res.status(400).json({ message: "The camp must end after it starts, within 3 days." });
    }
    if (capacity < 5 || capacity > 2000) return res.status(400).json({ message: "Capacity must be between 5 and 2000 donors." });

    // Where: the hospital's own listed location, unless a different spot is given.
    const hospital = await Hospital.findOne({ ownerId: req.userId }).select("name location").lean();
    const point = readPoint(req.body) || hospital?.location?.coordinates;
    if (!point) return res.status(400).json({ message: "Set your hospital's location first, or give the camp's location." });

    const camp = await DonationCamp.create({
      organiserId: req.userId,
      organiserName: req.user.orgName || hospital?.name || req.user.name,
      title, description, venue, startsAt, endsAt, capacity,
      location: { type: "Point", coordinates: point },
    });
    res.status(201).json({ camp: campView(camp.toObject(), req.userId, null) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** The hospital's own camps with who registered. */
const myCamps = async (req, res) => {
  try {
    const camps = await DonationCamp.find({ organiserId: req.userId })
      .sort({ startsAt: -1 })
      .limit(50)
      .populate("registrations.userId", "name phone bloodGroup lastDonatedAt")
      .lean();
    res.json({
      camps: camps.map((camp) => ({
        ...campView({ ...camp, registrations: camp.registrations.map((r) => ({ ...r, userId: r.userId?._id })) }, null, null),
        registrations: camp.registrations
          .filter((r) => r.userId)
          .map((r) => ({
            userId: r.userId._id,
            name: r.userId.name,
            phone: r.userId.phone || "",
            bloodGroup: r.userId.bloodGroup || "",
            registeredAt: r.registeredAt,
            donatedAt: r.donatedAt || null,
          })),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const cancelCamp = async (req, res) => {
  try {
    const camp = await DonationCamp.findOne({ _id: req.params.id, organiserId: req.userId });
    if (!camp) return res.status(404).json({ message: "Camp not found" });
    if (camp.endsAt < new Date()) return res.status(400).json({ message: "A camp that has ended can't be cancelled." });
    await camp.deleteOne();
    sendToUsers(camp.registrations.map((r) => r.userId), {
      title: "Blood donation camp cancelled",
      body: `"${camp.title}" has been cancelled by the organiser. Sorry for the trouble.`,
      url: "/blood-donation",
      tag: `camp-${camp._id}`,
    }).catch(() => {});
    res.json({ message: "Camp cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const register = async (req, res) => {
  try {
    if (!isCivilian(req.user.role)) return res.status(403).json({ message: "Only civilian accounts can register to donate." });
    const camp = await DonationCamp.findById(req.params.id);
    if (!camp || camp.endsAt < new Date()) return res.status(404).json({ message: "This camp is no longer open." });
    if (camp.registrations.some((r) => String(r.userId) === String(req.userId))) {
      return res.status(400).json({ message: "You're already registered for this camp." });
    }
    const eligibleAt = nextEligibleDate(req.user.lastDonatedAt);
    if (eligibleAt && eligibleAt > camp.startsAt) {
      return res.status(400).json({ message: "You'll still be resting after your last donation on the camp day.", nextEligibleAt: eligibleAt });
    }

    // Only adds the person while there's room, even if two people register at the same time.
    const updated = await DonationCamp.findOneAndUpdate(
      { _id: camp._id, "registrations.userId": { $ne: req.userId }, $expr: { $lt: [{ $size: "$registrations" }, "$capacity"] } },
      { $push: { registrations: { userId: req.userId } } },
      { returnDocument: "after" }
    ).lean();
    if (!updated) return res.status(400).json({ message: "Sorry, this camp is full." });
    res.json({ camp: campView(updated, req.userId, null) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const unregister = async (req, res) => {
  try {
    const updated = await DonationCamp.findOneAndUpdate(
      { _id: req.params.id, endsAt: { $gte: new Date() } },
      { $pull: { registrations: { userId: req.userId, donatedAt: { $exists: false } } } },
      { returnDocument: "after" }
    ).lean();
    if (!updated) return res.status(404).json({ message: "This camp is no longer open." });
    res.json({ camp: campView(updated, req.userId, null) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** On the day: the hospital confirms a registered donor gave blood. */
const markDonated = async (req, res) => {
  try {
    const camp = await DonationCamp.findOne({ _id: req.params.id, organiserId: req.userId });
    if (!camp) return res.status(404).json({ message: "Camp not found" });
    if (camp.startsAt > new Date()) return res.status(400).json({ message: "Donations can be marked once the camp has started." });
    const registration = camp.registrations.find((r) => String(r.userId) === req.params.userId);
    if (!registration) return res.status(404).json({ message: "This person isn't registered for the camp." });
    if (registration.donatedAt) return res.status(400).json({ message: "Already marked as donated." });

    const donor = await User.findById(registration.userId);
    if (!donor) return res.status(404).json({ message: "Donor account not found" });
    const eligibleAt = nextEligibleDate(donor.lastDonatedAt);
    if (eligibleAt && eligibleAt > new Date()) {
      return res.status(400).json({ message: "This donor already has a donation recorded in the last 90 days." });
    }

    const now = new Date();
    donor.lastDonatedAt = now;
    donor.donationCount = (donor.donationCount || 0) + 1;
    donor.donorAvailable = false;
    donor.lastDonationPlace = `${camp.title}, ${camp.venue}`;
    await donor.save();
    registration.donatedAt = now;
    await camp.save();

    sendToUsers([donor._id], {
      title: "🩸 Thank you for donating blood!",
      body: "Your donation is recorded. Download your certificate from Blood Donation in LifeLink.",
      url: "/blood-donation",
      tag: `camp-${camp._id}`,
    }).catch(() => {});
    res.json({ message: "Donation recorded", donationCount: donor.donationCount });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listCamps, createCamp, myCamps, cancelCamp, register, unregister, markDonated };
