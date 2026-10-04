const actorModelForRole = (role) =>
  String(role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";

const actorLabelForRole = (model) => model === "SuperAdmin" ? "SuperAdmin" : "Admin / Leader";

function getFinanceActor(req) {
  const model = actorModelForRole(req?.user?.role);
  const id = req?.user?._id || null;
  const name = String(
    req?.user?.fullName ||
    req?.user?.name ||
    req?.user?.email ||
    actorLabelForRole(model)
  ).trim();
  return { id, model, name: name || actorLabelForRole(model) };
}

module.exports = { getFinanceActor, actorModelForRole, actorLabelForRole };
