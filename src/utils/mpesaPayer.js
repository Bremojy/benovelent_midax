export const resolveMpesaPayer = (transaction = {}) => {
  const payer = transaction?.payerId;
  const member = transaction?.member;
  const payerModel = transaction?.payerModel || (member ? "Member" : "");

  const name = payer?.fullName
    || payer?.name
    || member?.fullName
    || member?.memberNumber
    || payer?.memberNumber
    || payer?.email
    || transaction?.phoneNumber
    || "Unknown payer";

  return {
    name: String(name),
    model: payerModel === "Admin" ? "Admin / Leader" : payerModel === "Member" ? "Member" : "Account",
    reference: payer?.memberNumber
      || member?.memberNumber
      || payer?.email
      || transaction?.phoneNumber
      || "",
  };
};
