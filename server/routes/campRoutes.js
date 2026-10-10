const express = require("express");
const router = express.Router();
const { protect, requireApproved, requireHospital } = require("../middleware/authMiddleware");
const {
  listCamps, createCamp, myCamps, cancelCamp, register, unregister, markDonated,
} = require("../controllers/campController");

router.get("/", protect, requireApproved, listCamps);
router.get("/mine", protect, requireHospital, myCamps);
router.post("/", protect, requireHospital, createCamp);
router.delete("/:id", protect, requireHospital, cancelCamp);
router.post("/:id/register", protect, requireApproved, register);
router.delete("/:id/register", protect, requireApproved, unregister);
router.post("/:id/donated/:userId", protect, requireHospital, markDonated);

module.exports = router;
