/** Strips blood group/allergies/medical history from the populated citizen unless the alert opted in to share them. */
function redactMedicalId(request) {
  const obj = typeof request.toObject === "function" ? request.toObject() : request;
  if (obj.citizenId && typeof obj.citizenId === "object" && !obj.shareMedicalId) {
    const { _id, name, phone } = obj.citizenId;
    obj.citizenId = { _id, name, phone };
  }
  return obj;
}

module.exports = { redactMedicalId };
