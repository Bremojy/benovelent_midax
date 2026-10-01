const express = require("express");
const router = express.Router();
const {
  addDependent, getDependents, getDependent, updateDependent, deleteDependent, verifyDependent, getAllDependents, getDependentsForMember,
  createEditRequest, getMyEditRequests, getAdminEditRequests, reviewEditRequest, completeEditRequest,
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
router.get("/my", protect, verified, memberStatus, profileCompleted, isMember, getDependents);
router.post("/edit-requests", protect, verified, memberStatus, profileCompleted, isMember, setUploadType("dependent-edit-requests"), uploadArray("supportingFiles", 5), createEditRequest);
router.get("/edit-requests/mine", protect, verified, memberStatus, profileCompleted, isMember, getMyEditRequests);
router.get("/edit-requests/admin", protect, isAdminOrSuperAdmin, getAdminEditRequests);
router.get("/edit-requests/:id/files/:index", protect, verified, memberStatus, profileCompleted, getEditRequestFile);
router.post("/edit-requests/:id/review", protect, isAdminOrSuperAdmin, reviewEditRequest);
router.post("/edit-requests/:id/complete", protect, verified, memberStatus, profileCompleted, isMember, completeEditRequest);
router.get("/admin/member/:memberId", protect, admin, getDependentsForMember);
router.get("/admin", protect, admin, getAllDependents);
router.put("/:id/verify", protect, admin, verifyDependent);
router.post("/:id/documents/replace", protect, verified, memberStatus, profileCompleted, setUploadType("dependent-documents"), uploadArray("documents", 1), uploadDependentDocuments);
router.post("/:id/documents", protect, verified, memberStatus, profileCompleted, setUploadType("dependent-documents"), uploadArray("documents", 10), uploadDependentDocuments);
router.get("/:id/documents", protect, verified, memberStatus, profileCompleted, getDependentDocuments);
router.get("/:id/documents/:documentId/file", protect, verified, memberStatus, profileCompleted, getDependentDocumentFile);
router.patch("/:id/documents/:documentId/verify", protect, isAdminOrSuperAdmin, verifyDependentDocument);
router.delete("/:id/documents/:documentId", protect, isAdminOrSuperAdmin, deleteDependentDocument);
router.put("/:id", protect, isAdminOrSuperAdmin, updateDependent);
router.delete("/:id", protect, isAdminOrSuperAdmin, deleteDependent);
router.get("/:id", protect, verified, memberStatus, profileCompleted, getDependent);
module.exports = router;
