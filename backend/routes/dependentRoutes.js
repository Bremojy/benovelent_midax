const express = require("express");
const router = express.Router();
const {
  addDependent, getDependents, getDependent, updateDependent, deleteDependent, verifyDependent, getAllDependents, getDependentsForMember,
  createEditRequest, getMyEditRequests, getAdminEditRequests, reviewEditRequest,
  uploadDependentDocuments, getDependentDocuments, getDependentDocumentFile, getEditRequestFile, verifyDependentDocument, deleteDependentDocument,
} = require("../controllers/dependentController");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const verified = require("../middleware/verifiedMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const memberStatus = require("../middleware/memberStatusMiddleware");
const admin = require("../middleware/adminMiddleware");
const { isAdminOrSuperAdmin, isMember } = require("../middleware/roleMiddleware");
const { setUploadType, uploadArray } = require("../middleware/upload");

router.post("/", protect, verified, memberStatus, profileCompleted, isMember, addDependent);
router.get("/my", protect, isMember, getDependents);
router.post("/edit-requests", protect, verified, memberStatus, profileCompleted, isMember, setUploadType("dependent-edit-requests"), uploadArray("supportingFiles", 5), createEditRequest);
router.get("/edit-requests/mine", protect, isMember, getMyEditRequests);
router.get("/edit-requests/admin", protect, isAdminOrSuperAdmin, getAdminEditRequests);
router.get("/edit-requests/:id/files/:index", protect, getEditRequestFile);
router.post("/edit-requests/:id/review", protect, isAdminOrSuperAdmin, reviewEditRequest);
router.get("/admin/member/:memberId", protect, admin, getDependentsForMember);
router.get("/admin", protect, admin, getAllDependents);
router.put("/:id/verify", protect, admin, verifyDependent);
router.post("/:id/documents", protect, setUploadType("dependent-documents"), uploadArray("documents", 10), uploadDependentDocuments);
router.get("/:id/documents", protect, getDependentDocuments);
router.get("/:id/documents/:documentId/file", protect, getDependentDocumentFile);
router.patch("/:id/documents/:documentId/verify", protect, isAdminOrSuperAdmin, verifyDependentDocument);
router.delete("/:id/documents/:documentId", protect, isAdminOrSuperAdmin, deleteDependentDocument);
router.put("/:id", protect, isAdminOrSuperAdmin, updateDependent);
router.delete("/:id", protect, isAdminOrSuperAdmin, deleteDependent);
router.get("/:id", protect, getDependent);
module.exports = router;
