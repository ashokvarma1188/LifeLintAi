const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// For each recipient group, which donor groups are medically compatible.
// O- is the universal donor (can give to anyone); AB+ is the universal
// recipient (can receive from anyone).
const COMPATIBLE_DONORS = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

const compatibleDonorGroups = (recipientGroup) => COMPATIBLE_DONORS[recipientGroup] || [];

module.exports = { BLOOD_GROUPS, COMPATIBLE_DONORS, compatibleDonorGroups };
