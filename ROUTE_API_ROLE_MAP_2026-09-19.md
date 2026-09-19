# Benevolent MIDAX — Route / API / Role / Socket Audit Map

Generated from the authoritative ZIP after the 2026-09-19 audit edits. This is a source map; it is not evidence of live authenticated browser execution.

## Coverage counts
- React `<Route>` definitions discovered: **85**
- Portal/menu-linked route paths: **66 normalized unique paths**
- Backend router endpoint definitions discovered: **329**
- Frontend API calls checked by the repository route-contract test: **285** (the test is authoritative here; a simple regex inventory is lower because some calls are constructed indirectly).
- Backend Socket.IO listener event names: **36**
- Frontend Socket.IO listener event names: **21**

## React route map
| Route | Target | Role / behavior |
|---|---|---|
| `/` | `Home` | `public` |
| `/about` | `About` | `public` |
| `/services` | `Services` | `public` |
| `/leaders` | `Leaders` | `public` |
| `/constitution` | `Constitution` | `public` |
| `/gallery` | `Gallery` | `public` |
| `/news` | `News` | `public` |
| `/resources` | `Navigate` | `public` |
| `/events` | `Navigate` | `public` |
| `/contact` | `Contact` | `public` |
| `/privacy-policy` | `PrivacyPolicy` | `public` |
| `/terms-conditions` | `TermsConditions` | `public` |
| `/disclaimer` | `Disclaimer` | `public` |
| `/members` | `Navigate` | `member` |
| `/login` | `PublicOnlyRoute` | `public` |
| `/verify-membership` | `VerifyMembership` | `public` |
| `/member/account` | `ProtectedRoute` | `member` |
| `/member/money` | `ProtectedRoute` | `member` |
| `/member/support-center` | `ProtectedRoute` | `member` |
| `/member/community` | `ProtectedRoute` | `member` |
| `/member/help` | `ProtectedRoute` | `member` |
| `/admin/operations` | `ProtectedRoute` | `admin, superadmin` |
| `/admin/finance-center` | `ProtectedRoute` | `admin` |
| `/admin/communications` | `ProtectedRoute` | `admin` |
| `/admin/leadership` | `ProtectedRoute` | `admin` |
| `/superadmin/people` | `ProtectedRoute` | `superadmin` |
| `/superadmin/governance` | `ProtectedRoute` | `superadmin` |
| `/superadmin/finance-center` | `ProtectedRoute` | `superadmin` |
| `/superadmin/communications` | `ProtectedRoute` | `superadmin` |
| `/superadmin/system-center` | `ProtectedRoute` | `superadmin` |
| `/superadmin/settings-center` | `ProtectedRoute` | `superadmin` |
| `/admin` | `ProtectedRoute` | `admin` |
| `/admin/members` | `ProtectedRoute` | `admin, superadmin` |
| `/admin/platform` | `ProtectedRoute` | `admin, superadmin` |
| `/admin/accounts` | `ProtectedRoute` | `admin` |
| `/admin/finance` | `Navigate` | `admin (or redirect)` |
| `/admin/claims` | `ProtectedRoute` | `admin, superadmin` |
| `/admin/support` | `ProtectedRoute` | `admin, superadmin` |
| `/admin/messages` | `ProtectedRoute` | `admin` |
| `/admin/notifications` | `ProtectedRoute` | `admin` |
| `/admin/announcements` | `ProtectedRoute` | `admin` |
| `/admin/settings` | `ProtectedRoute` | `admin` |
| `/admin/website` | `ProtectedRoute` | `admin` |
| `/admin/reports` | `ProtectedRoute` | `admin` |
| `/superadmin/reports` | `ProtectedRoute` | `superadmin` |
| `/admin/polls` | `ProtectedRoute` | `admin` |
| `/admin/feedback` | `ProtectedRoute` | `admin` |
| `/member` | `ProtectedRoute` | `member` |
| `/member/profile` | `ProtectedRoute` | `member` |
| `/member/platform` | `ProtectedRoute` | `member` |
| `/member/accounts` | `ProtectedRoute` | `member` |
| `/member/contributions` | `ProtectedRoute` | `member` |
| `/member/claims` | `ProtectedRoute` | `member` |
| `/member/announcements` | `ProtectedRoute` | `member` |
| `/member/messages` | `ProtectedRoute` | `member` |
| `/member/notifications` | `ProtectedRoute` | `member` |
| `/member/settings` | `ProtectedRoute` | `member` |
| `/member/support` | `ProtectedRoute` | `member` |
| `/member/benefits` | `ProtectedRoute` | `member` |
| `/member/dependents` | `ProtectedRoute` | `member` |
| `/member/guide` | `ProtectedRoute` | `member` |
| `/member/polls` | `ProtectedRoute` | `member` |
| `/member/mpesa-records` | `ProtectedRoute` | `member` |
| `/member/feedback` | `ProtectedRoute` | `member` |
| `/superadmin` | `ProtectedRoute` | `superadmin` |
| `/superadmin/admins` | `ProtectedRoute` | `superadmin` |
| `/superadmin/platform` | `ProtectedRoute` | `superadmin` |
| `/superadmin/members` | `ProtectedRoute` | `superadmin` |
| `/superadmin/accounts` | `ProtectedRoute` | `superadmin` |
| `/superadmin/finance` | `Navigate` | `superadmin (or redirect)` |
| `/superadmin/audit` | `ProtectedRoute` | `superadmin` |
| `/superadmin/notifications` | `ProtectedRoute` | `superadmin` |
| `/superadmin/news` | `ProtectedRoute` | `superadmin` |
| `/superadmin/claims` | `ProtectedRoute` | `superadmin` |
| `/superadmin/support` | `ProtectedRoute` | `superadmin` |
| `/superadmin/settings` | `ProtectedRoute` | `superadmin` |
| `/superadmin/leaders` | `ProtectedRoute` | `superadmin` |
| `/superadmin/policies` | `ProtectedRoute` | `superadmin` |
| `/superadmin/password` | `ProtectedRoute` | `superadmin` |
| `/superadmin/data-integrity` | `ProtectedRoute` | `superadmin` |
| `/superadmin/system` | `ProtectedRoute` | `superadmin` |
| `/superadmin/constitution` | `ProtectedRoute` | `superadmin` |
| `/superadmin/polls` | `ProtectedRoute` | `superadmin` |
| `/superadmin/feedback` | `ProtectedRoute` | `superadmin` |
| `*` | `NotFound` | `public` |

## Backend mount points
- `/api/auth` → `authRoutes`
- `/api/member` → `memberRoutes`
- `/api/dependents` → `dependentRoutes`
- `/api/contributions` → `contributionRoutes`
- `/api/medical` → `medicalSupportRoutes`
- `/api/funeral` → `funeralSupportRoutes`
- `/api/education` → `educationSupportRoutes`
- `/api/finance` → `financeRoutes`
- `/api/conversations` → `conversationRoutes`
- `/api/messages` → `messageRoutes`
- `/api/notifications` → `notificationRoutes`
- `/api/contact` → `contactRoutes`
- `/api/member/support-requests` → `supportRequestRoutes`
- `/api/news` → `newsRoutes`
- `/api/leaders` → `leaderRoutes`
- `/api/carousel` → `carouselRoutes`
- `/api/website` → `websiteRoutes`
- `/api/polls` → `pollRoutes`
- `/api/feedback` → `feedbackRoutes`
- `/api/votes` → `voteRoutes`
- `/api/admin` → `adminRoutes`
- `/api/superadmin` → `superadminRoutes`
- `/api/audit-logs` → `auditLogRoutes`
- `/api/superadmin/data-integrity` → `dataIntegrityRoutes`
- `/api/platform` → `platformRoutes`
- `/api/policies` → `policyRoutes`
- `/api/payments` → `paymentRoutes`
- `/api/claims` → `claimWorkflowRoutes`

## Backend endpoint map
| Method | Route | Middleware/handler chain (source order) |
|---|---|---|
| `GET` | `/api/auth/csrf` | `csrfEndpoint` |
| `GET` | `/api/auth/socket-ticket` | `protect, authController.socketTicket` |
| `POST` | `/api/auth/login` | `authController.login` |
| `GET` | `/api/auth/me` | `protect,     authController.getMe` |
| `POST` | `/api/auth/logout` | `protect,     authController.logout` |
| `GET` | `/api/member/dashboard` | `protect, getDashboard` |
| `GET` | `/api/member/community-stats` | `protect, getCommunityStats` |
| `GET` | `/api/member/profile` | `protect, getProfile` |
| `PUT` | `/api/member/profile` | `protect,   setUploadType("profiles"` |
| `GET` | `/api/member/summary` | `protect, getSummary` |
| `GET` | `/api/member/contributions` | `protect,   getMemberContributions` |
| `GET` | `/api/member/finance` | `protect, getMemberTransactions` |
| `GET` | `/api/member/accounts` | `protect, getMemberAccounts` |
| `GET` | `/api/member/claims` | `protect,   getClaims` |
| `POST` | `/api/member/claims` | `protect,   isMember,   setUploadType("documents"` |
| `GET` | `/api/member/chat-members` | `protect, isChatUser, getChatMembers` |
| `PUT` | `/api/member/change-password` | `protect,   changePassword` |
| `GET` | `/api/member/profile-status` | `protect,   getProfileStatus` |
| `GET` | `/api/member/eligibility` | `protect,     profileCompleted,     getEligibility` |
| `GET` | `/api/member/benefits` | `protect,   getEligibility` |
| `GET` | `/api/member/settings` | `protect, getSettings` |
| `PUT` | `/api/member/settings` | `protect, updateSettings` |
| `POST` | `/api/dependents/` | `protect, verified, memberStatus, profileCompleted, isMember, addDependent` |
| `GET` | `/api/dependents/my` | `protect, isMember, getDependents` |
| `POST` | `/api/dependents/edit-requests` | `protect, verified, memberStatus, profileCompleted, isMember, setUploadType("dependent-edit-requests"` |
| `GET` | `/api/dependents/edit-requests/mine` | `protect, isMember, getMyEditRequests` |
| `GET` | `/api/dependents/edit-requests/admin` | `protect, isAdminOrSuperAdmin, getAdminEditRequests` |
| `GET` | `/api/dependents/edit-requests/:id/files/:index` | `protect, getEditRequestFile` |
| `POST` | `/api/dependents/edit-requests/:id/review` | `protect, isAdminOrSuperAdmin, reviewEditRequest` |
| `POST` | `/api/dependents/edit-requests/:id/complete` | `protect, isMember, completeEditRequest` |
| `GET` | `/api/dependents/admin/member/:memberId` | `protect, admin, getDependentsForMember` |
| `GET` | `/api/dependents/admin` | `protect, admin, getAllDependents` |
| `PUT` | `/api/dependents/:id/verify` | `protect, admin, verifyDependent` |
| `POST` | `/api/dependents/:id/documents/replace` | `protect, setUploadType("dependent-documents"` |
| `POST` | `/api/dependents/:id/documents` | `protect, setUploadType("dependent-documents"` |
| `GET` | `/api/dependents/:id/documents` | `protect, getDependentDocuments` |
| `GET` | `/api/dependents/:id/documents/:documentId/file` | `protect, getDependentDocumentFile` |
| `PATCH` | `/api/dependents/:id/documents/:documentId/verify` | `protect, isAdminOrSuperAdmin, verifyDependentDocument` |
| `DELETE` | `/api/dependents/:id/documents/:documentId` | `protect, isAdminOrSuperAdmin, deleteDependentDocument` |
| `PUT` | `/api/dependents/:id` | `protect, isAdminOrSuperAdmin, updateDependent` |
| `DELETE` | `/api/dependents/:id` | `protect, isAdminOrSuperAdmin, deleteDependent` |
| `GET` | `/api/dependents/:id` | `protect, getDependent` |
| `POST` | `/api/contributions/` | `protect, isAdminOrSuperAdmin, createContribution` |
| `GET` | `/api/contributions/` | `protect, isAdminOrSuperAdmin, getContributions` |
| `POST` | `/api/contributions/bulk` | `protect, isAdminOrSuperAdmin, createBulkContributionRun` |
| `GET` | `/api/contributions/member/:memberId` | `protect, getMemberContributions` |
| `GET` | `/api/contributions/:id` | `protect, getContribution` |
| `PUT` | `/api/contributions/:id` | `protect, isAdminOrSuperAdmin, updateContribution` |
| `DELETE` | `/api/contributions/:id` | `protect, isAdminOrSuperAdmin, deleteContribution` |
| `PUT` | `/api/contributions/:id/approve` | `protect, isAdminOrSuperAdmin, approveContribution` |
| `PUT` | `/api/contributions/:id/reject` | `protect, isAdminOrSuperAdmin, rejectContribution` |
| `POST` | `/api/medical/apply` | `verifyToken,     isMember,     setUploadType("documents"` |
| `GET` | `/api/medical/my-applications` | `verifyToken,     isMember,     medicalController.getMyApplications` |
| `GET` | `/api/medical/:id` | `verifyToken,     medicalController.getApplicationById` |
| `PUT` | `/api/medical/cancel/:id` | `verifyToken,     isMember,     medicalController.cancelApplication` |
| `GET` | `/api/medical/admin/summary` | `verifyToken,     isAdminOrSuperAdmin,     medicalController.getMedicalSummary` |
| `GET` | `/api/medical/admin/applications` | `verifyToken,     isAdminOrSuperAdmin,     medicalController.getAllApplications` |
| `PUT` | `/api/medical/admin/review/:id` | `verifyToken,     isAdminOrSuperAdmin,     medicalController.markUnderReview` |
| `PUT` | `/api/medical/admin/approve/:id` | `verifyToken,     isAdminOrSuperAdmin,     medicalController.approveApplication` |
| `PUT` | `/api/medical/admin/reject/:id` | `verifyToken,     isAdminOrSuperAdmin,     medicalController.rejectApplication` |
| `PUT` | `/api/medical/admin/pay/:id` | `verifyToken,     isAdminOrSuperAdmin,     medicalController.markAsPaid` |
| `DELETE` | `/api/medical/admin/delete/:id` | `verifyToken,     isSuperAdmin,     medicalController.deleteApplication` |
| `POST` | `/api/funeral/apply` | `protect,      verified,      memberStatus,      profileCompleted,     setUploadType("documents"` |
| `GET` | `/api/funeral/my-applications` | `protect,      getMyApplications` |
| `GET` | `/api/funeral/:id` | `protect,      getApplicationById` |
| `GET` | `/api/funeral/` | `protect,      admin,      getAllApplications` |
| `GET` | `/api/funeral/dashboard/summary` | `protect,      admin,      getFuneralSummary` |
| `PUT` | `/api/funeral/:id/approve` | `protect,      admin,      approveApplication` |
| `PUT` | `/api/funeral/:id/reject` | `protect,      admin,      rejectApplication` |
| `PUT` | `/api/funeral/:id/payment` | `protect,      admin,      recordPayment` |
| `PUT` | `/api/funeral/:id/close` | `protect,      admin,      closeApplication` |
| `DELETE` | `/api/funeral/:id` | `protect,      superAdmin,      deleteApplication` |
| `POST` | `/api/education/apply` | `protect,     requireVerifiedMember,     profileCompleted,     requireActiveMember,     setUploadType("documents"` |
| `GET` | `/api/education/my-applications` | `protect,     getMyApplications` |
| `GET` | `/api/education/:id` | `protect,     getApplicationById` |
| `GET` | `/api/education/dashboard` | `protect,     requireAdmin,     getEducationSummary` |
| `GET` | `/api/education/` | `protect,     requireAdmin,     getAllApplications` |
| `PUT` | `/api/education/:id/approve` | `protect,     requireAdmin,     approveApplication` |
| `PUT` | `/api/education/:id/reject` | `protect,     requireAdmin,     rejectApplication` |
| `PUT` | `/api/education/:id/disburse` | `protect,     requireAdmin,     disburseFunds` |
| `PUT` | `/api/education/:id/repayment` | `protect,     requireAdmin,     recordRepayment` |
| `DELETE` | `/api/education/:id` | `protect,     requireSuperAdmin,     deleteApplication` |
| `POST` | `/api/finance/` | `protect, isAdminOrSuperAdmin, createTransaction` |
| `GET` | `/api/finance/` | `protect, isAdminOrSuperAdmin, getTransactions` |
| `GET` | `/api/finance/book-balance` | `protect, getBookBalance` |
| `GET` | `/api/finance/constitution-ledger` | `protect, constitutionLedger` |
| `GET` | `/api/finance/ledger` | `protect, getLedger` |
| `GET` | `/api/finance/constitution-ledger/export.pdf` | `protect, exportConstitutionLedger` |
| `GET` | `/api/finance/constitution-ledger/export.csv` | `protect, exportConstitutionLedgerCsv` |
| `GET` | `/api/finance/summary/dashboard` | `protect, isAdminOrSuperAdmin, getFinanceSummary` |
| `GET` | `/api/finance/member/:memberId` | `protect, getMemberTransactions` |
| `GET` | `/api/finance/:id` | `protect, getTransaction` |
| `PUT` | `/api/finance/:id` | `protect, isAdminOrSuperAdmin, updateTransaction` |
| `DELETE` | `/api/finance/:id` | `protect, isAdminOrSuperAdmin, deleteTransaction` |
| `POST` | `/api/finance/:id/attachment` | `protect, isAdminOrSuperAdmin, setUploadType("finance"` |
| `PATCH` | `/api/finance/:id/visibility` | `protect, isSuperAdmin, hideTransaction` |
| `PUT` | `/api/finance/:id/approve` | `protect, isAdminOrSuperAdmin, approveTransaction` |
| `PUT` | `/api/finance/:id/reject` | `protect, isAdminOrSuperAdmin, rejectTransaction` |
| `POST` | `/api/conversations/` | `protect, isChatUser, safeHandler(createConversation, "Conversation creation"` |
| `GET` | `/api/conversations/` | `protect, isChatUser, safeHandler(getMyConversations, "Conversation loading"` |
| `GET` | `/api/conversations/:id` | `protect, isChatUser, safeHandler(getConversation, "Conversation loading"` |
| `PUT` | `/api/conversations/:id/read` | `protect, isChatUser, safeHandler(markConversationRead, "Conversation read status"` |
| `DELETE` | `/api/conversations/:id` | `protect, isChatUser, safeHandler(deleteConversation, "Conversation removal"` |
| `PUT` | `/api/conversations/:id/pin` | `protect, isChatUser, safeHandler(pinConversation, "Conversation pinning"` |
| `PUT` | `/api/conversations/:id/mute` | `protect, isChatUser, safeHandler(muteConversation, "Conversation muting"` |
| `PUT` | `/api/conversations/:id/add-member` | `protect, isChatUser, safeHandler(addMember, "Add member"` |
| `PUT` | `/api/conversations/:id/remove-member` | `protect, isChatUser, safeHandler(removeMember, "Remove member"` |
| `POST` | `/api/messages/upload` | `protect, isChatUser, setUploadType("messages"` |
| `POST` | `/api/messages/` | `protect, isChatUser, sendMessage` |
| `GET` | `/api/messages/conversation/:conversationId` | `protect, isChatUser, getConversationMessages` |
| `GET` | `/api/messages/:id` | `protect, isChatUser, getMessage` |
| `PUT` | `/api/messages/:id` | `protect, isChatUser, editMessage` |
| `DELETE` | `/api/messages/:id` | `protect, isChatUser, deleteMessage` |
| `DELETE` | `/api/messages/:id/everyone` | `protect, isChatUser, deleteForEveryone` |
| `PUT` | `/api/messages/:id/react` | `protect, isChatUser, reactToMessage` |
| `PUT` | `/api/messages/:id/read` | `protect, isChatUser, markAsRead` |
| `GET` | `/api/notifications/` | `protect, getNotifications` |
| `GET` | `/api/notifications/unread-count` | `protect, getUnreadCount` |
| `GET` | `/api/notifications/push/vapid-public-key` | `getPushPublicKey` |
| `POST` | `/api/notifications/push/subscribe` | `protect, savePushSubscription` |
| `DELETE` | `/api/notifications/push/subscribe` | `protect, removePushSubscription` |
| `GET` | `/api/notifications/:id` | `protect, getNotification` |
| `POST` | `/api/notifications/` | `protect, isAdminOrSuperAdmin, createNotification` |
| `POST` | `/api/notifications/broadcast` | `protect, isAdminOrSuperAdmin, broadcastToMembers` |
| `PUT` | `/api/notifications/:id/read` | `protect, markAsRead` |
| `PUT` | `/api/notifications/read-all` | `protect, markAllAsRead` |
| `DELETE` | `/api/notifications/clear` | `protect, clearNotifications` |
| `DELETE` | `/api/notifications/:id` | `protect, deleteNotification` |
| `DELETE` | `/api/notifications/` | `protect, clearNotifications` |
| `POST` | `/api/contact/` | `createContactMessage` |
| `GET` | `/api/contact/` | `protect, isAdminOrSuperAdmin, getContactMessages` |
| `PATCH` | `/api/contact/:id` | `protect, isAdminOrSuperAdmin, updateContactMessage` |
| `DELETE` | `/api/contact/:id` | `protect, isAdminOrSuperAdmin, deleteContactMessage` |
| `POST` | `/api/member/support-requests/` | `verifyToken,   isMember,   setUploadType("documents"` |
| `GET` | `/api/member/support-requests/mine` | `verifyToken, isMember, controller.mine` |
| `PUT` | `/api/member/support-requests/mine/:id` | `verifyToken, isMember, setUploadType("documents"` |
| `DELETE` | `/api/member/support-requests/mine/:id` | `verifyToken, isMember, controller.memberRemove` |
| `GET` | `/api/member/support-requests/` | `verifyToken, isAdminOrSuperAdmin, controller.all` |
| `GET` | `/api/member/support-requests/:id` | `verifyToken, isAdminOrSuperAdmin, controller.getOne` |
| `PUT` | `/api/member/support-requests/:id` | `verifyToken, isAdminOrSuperAdmin, controller.update` |
| `DELETE` | `/api/member/support-requests/:id` | `verifyToken, isSuperAdmin, controller.remove` |
| `POST` | `/api/news/` | `protect, isAdminOrSuperAdmin, setUploadType("news"` |
| `GET` | `/api/news/public` | `getLatestNews` |
| `GET` | `/api/news/` | `protect, getNews` |
| `GET` | `/api/news/:id` | `protect, getSingleNews` |
| `PUT` | `/api/news/:id` | `protect, isAdminOrSuperAdmin, updateNews` |
| `POST` | `/api/news/:id/publish` | `protect, isAdminOrSuperAdmin, publishNews` |
| `POST` | `/api/news/:id/unpublish` | `protect, isAdminOrSuperAdmin, unpublishNews` |
| `DELETE` | `/api/news/:id` | `protect, isAdminOrSuperAdmin, deleteNews` |
| `PUT` | `/api/news/:id/like` | `protect, likeNews` |
| `PUT` | `/api/news/:id/unlike` | `protect, unlikeNews` |
| `POST` | `/api/news/:id/comment` | `protect, addComment` |
| `DELETE` | `/api/news/:id/comment/:commentId` | `protect, deleteComment` |
| `PUT` | `/api/news/:id/pin` | `protect, isAdminOrSuperAdmin, pinNews` |
| `PUT` | `/api/news/:id/unpin` | `protect, isAdminOrSuperAdmin, unpinNews` |
| `GET` | `/api/leaders/` | `async (req, res` |
| `GET` | `/api/leaders/current` | `async (_req, res` |
| `GET` | `/api/leaders/active` | `async (req, res` |
| `POST` | `/api/leaders/upload` | `protect, isSuperAdmin, setUploadType("leaders"` |
| `PUT` | `/api/leaders/:id` | `protect, isSuperAdmin, setUploadType("leaders"` |
| `DELETE` | `/api/leaders/:id` | `protect, isSuperAdmin, async (req, res` |
| `GET` | `/api/carousel/` | `async (req, res` |
| `GET` | `/api/carousel/active` | `async (req, res` |
| `POST` | `/api/carousel/upload` | `protect, isSuperAdmin, setUploadType("carousel"` |
| `POST` | `/api/carousel/` | `protect, isSuperAdmin, async (req, res` |
| `PUT` | `/api/carousel/:id` | `protect, isSuperAdmin, setUploadType("carousel"` |
| `DELETE` | `/api/carousel/:id` | `protect, isSuperAdmin, async (req, res` |
| `GET` | `/api/website/` | `getWebsiteContent` |
| `GET` | `/api/website/settings` | `getWebsiteSettings` |
| `GET` | `/api/website/gallery` | `getGallery` |
| `GET` | `/api/website/constitution` | `getConstitution` |
| `POST` | `/api/website/gallery/upload` | `protect, isSuperAdmin, setUploadType("gallery"` |
| `POST` | `/api/website/constitution/upload` | `protect, isSuperAdmin, setUploadType("documents"` |
| `GET` | `/api/website/:section` | `getSection` |
| `POST` | `/api/website/` | `protect, isSuperAdmin, createSection` |
| `PUT` | `/api/website/settings` | `protect, isSuperAdmin, (req, res` |
| `PUT` | `/api/website/:section` | `protect, isSuperAdmin, updateSection` |
| `DELETE` | `/api/website/:section` | `protect, isSuperAdmin, deleteSection` |
| `POST` | `/api/polls/` | `protect, isAdminOrSuperAdmin, createPoll` |
| `GET` | `/api/polls/public` | `getPublicPolls` |
| `GET` | `/api/polls/` | `protect, getPolls` |
| `GET` | `/api/polls/:id` | `protect, getPoll` |
| `PUT` | `/api/polls/:id` | `protect, isAdminOrSuperAdmin, updatePoll` |
| `DELETE` | `/api/polls/:id` | `protect, isAdminOrSuperAdmin, deletePoll` |
| `PUT` | `/api/polls/:id/close` | `protect, isAdminOrSuperAdmin, closePoll` |
| `PUT` | `/api/polls/:id/reopen` | `protect, isAdminOrSuperAdmin, reopenPoll` |
| `GET` | `/api/polls/:id/results` | `protect, isAdminOrSuperAdmin, getPollResults` |
| `GET` | `/api/feedback/` | `protect, controller.list` |
| `GET` | `/api/feedback/pending/login` | `protect, controller.pendingLogin` |
| `POST` | `/api/feedback/` | `protect, isAdminOrSuperAdmin, controller.create` |
| `POST` | `/api/feedback/built-in` | `protect, isAdminOrSuperAdmin, controller.ensureBuiltIn` |
| `POST` | `/api/feedback/auto-generate` | `protect, isAdminOrSuperAdmin, controller.autoGenerate` |
| `PUT` | `/api/feedback/:id` | `protect, isAdminOrSuperAdmin, controller.update` |
| `DELETE` | `/api/feedback/:id` | `protect, isAdminOrSuperAdmin, controller.remove` |
| `POST` | `/api/feedback/:id/responses` | `protect, controller.submit` |
| `GET` | `/api/feedback/:id/responses` | `protect, isAdminOrSuperAdmin, controller.responses` |
| `GET` | `/api/feedback/:id/export` | `protect, isAdminOrSuperAdmin, controller.exportResponses` |
| `POST` | `/api/feedback/:id/import` | `protect, isAdminOrSuperAdmin, importUpload.single("file"` |
| `POST` | `/api/feedback/:id/publish-news` | `protect, isAdminOrSuperAdmin, controller.publishToNews` |
| `GET` | `/api/feedback/published/:id/download` | `protect, controller.memberDownload` |
| `POST` | `/api/votes/:pollId` | `protect, isMember, castVote` |
| `GET` | `/api/votes/poll/:pollId/me` | `protect, isMember, getMyVote` |
| `GET` | `/api/votes/poll/:pollId` | `protect, isAdminOrSuperAdmin, getVotesByPoll` |
| `PUT` | `/api/votes/:id` | `protect, isMember, updateVote` |
| `DELETE` | `/api/votes/:id` | `protect, isMember, deleteVote` |
| `GET` | `/api/admin/dashboard` | `protect,   isAdmin,   getDashboard` |
| `GET` | `/api/admin/reports/export.pdf` | `protect, isAdminOrSuperAdmin, exportManagementReportsPdf` |
| `GET` | `/api/admin/reports/export.csv` | `protect, isAdminOrSuperAdmin, exportManagementReportsCsv` |
| `GET` | `/api/admin/reports` | `protect, isAdminOrSuperAdmin, getManagementReports` |
| `GET` | `/api/admin/profile` | `protect, isAdmin, getProfile` |
| `PUT` | `/api/admin/profile` | `protect,   isAdmin,   setUploadType("profiles"` |
| `PUT` | `/api/admin/change-password` | `protect, isAdmin, changePassword` |
| `GET` | `/api/admin/settings` | `protect, isAdmin, getSettings` |
| `PUT` | `/api/admin/settings` | `protect, isAdmin, updateSettings` |
| `GET` | `/api/admin/colleagues` | `protect, isAdminOrSuperAdmin, getColleagues` |
| `POST` | `/api/admin/claims/:type/:id/open` | `protect, isAdminOrSuperAdmin, openClaimDocument` |
| `POST` | `/api/admin/members` | `protect,   isAdminOrSuperAdmin,   setUploadType("member-documents"` |
| `GET` | `/api/admin/statistics` | `protect,   isAdminOrSuperAdmin,   getStatistics` |
| `GET` | `/api/admin/members/statistics` | `protect,   isAdminOrSuperAdmin,   getStatistics` |
| `GET` | `/api/admin/members/recent` | `protect,   isAdminOrSuperAdmin,   getRecentMembers` |
| `GET` | `/api/admin/members/filter` | `protect,   isAdminOrSuperAdmin,   filterMembers` |
| `GET` | `/api/admin/members/monthly-registrations` | `protect,   isAdminOrSuperAdmin,   monthlyRegistrations` |
| `GET` | `/api/admin/members/contribution-summary` | `protect,   isAdminOrSuperAdmin,   contributionSummary` |
| `GET` | `/api/admin/members` | `protect,   isAdminOrSuperAdmin,   getMembers` |
| `GET` | `/api/admin/members/:id` | `protect,   isAdminOrSuperAdmin,   getMember` |
| `PUT` | `/api/admin/members/:id` | `protect,   isAdminOrSuperAdmin,   updateMember` |
| `PATCH` | `/api/admin/members/:id/verify` | `protect,   isAdminOrSuperAdmin,   verifyMember` |
| `PATCH` | `/api/admin/members/:id/suspend` | `protect,   isAdminOrSuperAdmin,   suspendMember` |
| `PATCH` | `/api/admin/members/:id/activate` | `protect,   isAdminOrSuperAdmin,   activateMember` |
| `DELETE` | `/api/admin/members/:id` | `protect,   isSuperAdmin,   deleteMember` |
| `PATCH` | `/api/admin/members/:id/restore` | `protect,   isSuperAdmin,   restoreMember` |
| `PATCH` | `/api/admin/members/:id/reset-password` | `protect,   isSuperAdmin,   resetPassword` |
| `GET` | `/api/superadmin/profile` | `getProfile` |
| `PUT` | `/api/superadmin/profile` | `setUploadType("profiles"` |
| `PUT` | `/api/superadmin/change-password` | `changePassword` |
| `GET` | `/api/superadmin/settings` | `getSettings` |
| `PUT` | `/api/superadmin/settings` | `updateSettings` |
| `GET` | `/api/superadmin/system/status` | `getSystemStatus` |
| `GET` | `/api/superadmin/overview` | `getPortalOverview` |
| `GET` | `/api/superadmin/admins/statistics` | `getAdminStatistics` |
| `GET` | `/api/superadmin/admins` | `getAdmins` |
| `POST` | `/api/superadmin/admins` | `createAdmin` |
| `GET` | `/api/superadmin/admins/:id` | `getAdmin` |
| `PUT` | `/api/superadmin/admins/:id` | `updateAdmin` |
| `PATCH` | `/api/superadmin/admins/:id/suspend` | `suspendAdmin` |
| `PATCH` | `/api/superadmin/admins/:id/activate` | `activateAdmin` |
| `PATCH` | `/api/superadmin/admins/:id/reset-password` | `resetAdminPassword` |
| `DELETE` | `/api/superadmin/admins/:id` | `deleteAdmin` |
| `GET` | `/api/audit-logs/summary` | `protect,     admin,     getAuditSummary` |
| `GET` | `/api/audit-logs/coverage` | `protect,     admin,     getAuditCoverage` |
| `GET` | `/api/audit-logs/` | `protect,     admin,     getAuditLogs` |
| `GET` | `/api/audit-logs/:id` | `protect,     admin,     getAuditLog` |
| `DELETE` | `/api/audit-logs/:id` | `protect,     superAdmin,     deleteAuditLog` |
| `GET` | `/api/superadmin/data-integrity/` | `getIntegrityReport` |
| `GET` | `/api/superadmin/data-integrity/backup` | `downloadDatabaseBackup` |
| `GET` | `/api/superadmin/data-integrity/backup/human` | `downloadHumanBackup` |
| `GET` | `/api/superadmin/data-integrity/backup/human/print` | `printHumanBackup` |
| `GET` | `/api/superadmin/data-integrity/print-database` | `printDatabaseDetails` |
| `POST` | `/api/superadmin/data-integrity/cleanup` | `runSafeCleanup` |
| `POST` | `/api/superadmin/data-integrity/cleanup/carousels` | `cleanupCarouselDuplicates` |
| `POST` | `/api/superadmin/data-integrity/cleanup/carousels/deep` | `deepScanCarouselDuplicates` |
| `POST` | `/api/superadmin/data-integrity/cleanup/self-conversations` | `cleanupSelfConversations` |
| `POST` | `/api/superadmin/data-integrity/cleanup/orphans` | `cleanupOrphanedChatData` |
| `POST` | `/api/superadmin/data-integrity/cleanup/member-income` | `removeLegacyMemberIncome` |
| `GET` | `/api/superadmin/data-integrity/collections` | `getCollectionInventory` |
| `GET` | `/api/superadmin/data-integrity/members-reconciliation` | `getMemberReconciliation` |
| `GET` | `/api/superadmin/data-integrity/members/:id` | `getDuplicateMemberPreview` |
| `DELETE` | `/api/superadmin/data-integrity/members/:id` | `deleteDuplicateMember` |
| `GET` | `/api/platform/runtime-config` | `controller.runtimeConfig` |
| `POST` | `/api/platform/assistant` | `protect, controller.assistant` |
| `POST` | `/api/platform/public/assistant` | `controller.assistant` |
| `GET` | `/api/platform/activity` | `protect, controller.activityCenter` |
| `GET` | `/api/platform/directory` | `protect, controller.directory` |
| `GET` | `/api/platform/search` | `protect, controller.search` |
| `GET` | `/api/platform/events` | `protect, controller.events` |
| `POST` | `/api/platform/events` | `protect, isAdminOrSuperAdmin, controller.createEvent` |
| `POST` | `/api/platform/events/:id/rsvp` | `protect, controller.rsvp` |
| `GET` | `/api/platform/analytics` | `protect, isAdminOrSuperAdmin, controller.analytics` |
| `GET` | `/api/platform/documents` | `protect, controller.documents` |
| `GET` | `/api/platform/membership-card` | `protect, controller.membershipCard` |
| `GET` | `/api/platform/membership-card/:memberId` | `protect, isAdminOrSuperAdmin, controller.membershipCard` |
| `GET` | `/api/platform/assistant-context` | `protect, controller.assistantContext` |
| `GET` | `/api/platform/membership/verify` | `controller.verifyMembership` |
| `GET` | `/api/platform/public/events` | `controller.publicEvents` |
| `GET` | `/api/platform/public/documents` | `controller.publicDocuments` |
| `GET` | `/api/policies/public` | `controller.publicList` |
| `GET` | `/api/policies/` | `protect, controller.publicList` |
| `GET` | `/api/policies/admin` | `protect, isSuperAdmin, controller.list` |
| `POST` | `/api/policies/` | `protect, isSuperAdmin, controller.create` |
| `PUT` | `/api/policies/:id` | `protect, isSuperAdmin, controller.update` |
| `DELETE` | `/api/policies/:id` | `protect, isSuperAdmin, controller.remove` |
| `GET` | `/api/payments/route-status` | `controller.routeStatus` |
| `GET` | `/api/payments/public-config` | `controller.publicConfig` |
| `GET` | `/api/payments/config` | `protect, controller.config` |
| `GET` | `/api/payments/diagnostics` | `protect, isAdminOrSuperAdmin, controller.diagnostics` |
| `GET` | `/api/payments/mine` | `protect, controller.myTransactions` |
| `GET` | `/api/payments/transactions` | `protect, isAdminOrSuperAdmin, controller.allTransactions` |
| `GET` | `/api/payments/transactions/:id` | `protect, isContributionUser, controller.getTransaction` |
| `DELETE` | `/api/payments/transactions/:id` | `protect, isSuperAdmin, controller.deleteTransaction` |
| `POST` | `/api/payments/stk` | `protect, isContributionUser, controller.stk` |
| `POST` | `/api/payments/stk-query` | `protect, isContributionUser, controller.stkQuery` |
| `POST` | `/api/payments/manual` | `protect, isContributionUser, controller.manualPayment` |
| `GET` | `/api/payments/manual/admin` | `protect, isAdminOrSuperAdmin, controller.manualPaymentsAdmin` |
| `POST` | `/api/payments/manual/:id/verify` | `protect, isAdminOrSuperAdmin, controller.manualVerify` |
| `POST` | `/api/payments/manual/:id/reject` | `protect, isAdminOrSuperAdmin, controller.manualReject` |
| `POST` | `/api/payments/stkpush` | `protect, isMember, controller.stk` |
| `POST` | `/api/payments/mpesa-stk` | `protect, isMember, controller.stk` |
| `GET` | `/api/payments/callback` | `controller.callbackHealth` |
| `POST` | `/api/payments/callback` | `controller.callback` |
| `POST` | `/api/payments/b2c/result` | `controller.b2cResult` |
| `POST` | `/api/payments/b2c/timeout` | `controller.b2cTimeout` |
| `GET` | `/api/payments/b2c/history` | `protect, isSuperAdmin, controller.b2cHistory` |
| `POST` | `/api/payments/b2c/disburse` | `protect, isSuperAdmin, controller.disburseB2C` |
| `GET` | `/api/payments/community-assistance` | `protect, isMember, controller.communityCases` |
| `GET` | `/api/payments/community-assistance/admin` | `protect, isAdminOrSuperAdmin, controller.communityCases` |
| `GET` | `/api/payments/community-assistance/mine` | `protect, controller.myCommunityCases` |
| `POST` | `/api/payments/community-assistance` | `protect, isAdminOrSuperAdmin, controller.enableCommunityAssistance` |
| `POST` | `/api/payments/community-assistance/:id/payout` | `protect, isSuperAdmin, controller.payoutCommunity` |
| `POST` | `/api/payments/community-assistance/:id/close` | `protect, isSuperAdmin, controller.closeCommunity` |
| `DELETE` | `/api/payments/community-assistance/:id` | `protect, isSuperAdmin, controller.deleteCommunity` |
| `POST` | `/api/payments/transactions/:id/cancel` | `protect, isAdminOrSuperAdmin, controller.cancelTransaction` |
| `GET` | `/api/payments/community-assistance/mine/ledger` | `protect, isMember, controller.myCommunityLedger` |
| `GET` | `/api/claims/statuses` | `verifyToken, isAdminOrSuperAdmin, controller.statuses` |
| `GET` | `/api/claims/` | `verifyToken, isAdminOrSuperAdmin, controller.list` |
| `PUT` | `/api/claims/:type/:id/stage` | `verifyToken, isAdminOrSuperAdmin, controller.updateStage` |
| `DELETE` | `/api/claims/:type/:id` | `verifyToken, isAdminOrSuperAdmin, controller.remove` |
| `POST` | `/api/claims/:type/:id/publish-news` | `verifyToken, isAdminOrSuperAdmin, controller.publishClaimToNews` |
| `POST` | `/api/claims/community/:id/publish-news` | `verifyToken, isAdminOrSuperAdmin, controller.publishCommunityToNews` |
| `POST` | `/api/claims/community/request` | `verifyToken, require("../middleware/roleMiddleware"` |

## Frontend API-call inventory
| Source | Method | API path expression |
|---|---|---|
| `src/components/NotificationSettings.jsx` | `GET` | `/notifications/push/vapid-public-key` |
| `src/components/NotificationSettings.jsx` | `POST` | `/notifications/push/subscribe` |
| `src/components/NotificationSettings.jsx` | `GET` | `/notifications/push/vapid-public-key` |
| `src/components/ThemeBootstrap.jsx` | `GET` | `/website/settings` |
| `src/components/chat/ChatWindow.jsx` | `POST` | `/messages` |
| `src/components/chat/MessageCenterPage.jsx` | `GET` | `/auth/me` |
| `src/components/chat/MessageCenterPage.jsx` | `POST` | `/conversations` |
| `src/components/chat/MessageInput.jsx` | `POST` | `/messages/upload` |
| `src/components/dashboard/ChatPreview.jsx` | `GET` | `/conversations` |
| `src/components/dashboard/DashboardTopbar.jsx` | `GET` | `/notifications/unread-count` |
| `src/components/dashboard/DashboardTopbar.jsx` | `GET` | `/conversations` |
| `src/components/member/CommunityFeed.jsx` | `GET` | `/news/public` |
| `src/components/member/MembershipCard.jsx` | `GET` | `/platform/membership-card` |
| `src/components/member/NotificationCenter.jsx` | `GET` | `/notifications` |
| `src/components/member/RecentChats.jsx` | `GET` | `/conversations` |
| `src/components/payments/MpesaPaymentButton.jsx` | `POST` | `/payments/stk-query` |
| `src/components/payments/MpesaPaymentButton.jsx` | `GET` | `/payments/config` |
| `src/components/payments/MpesaPaymentButton.jsx` | `POST` | `/payments/manual` |
| `src/components/payments/MpesaPaymentButton.jsx` | `POST` | `/payments/stk` |
| `src/context/AuthContext.jsx` | `GET` | `/notifications/push/vapid-public-key` |
| `src/context/AuthContext.jsx` | `POST` | `/notifications/push/subscribe` |
| `src/hooks/usePublicSettings.js` | `GET` | `/website/settings` |
| `src/main.jsx` | `GET` | `/notifications/push/vapid-public-key` |
| `src/main.jsx` | `POST` | `/notifications/push/subscribe` |
| `src/pages/About.jsx` | `GET` | `/website` |
| `src/pages/Constitution.jsx` | `GET` | `/website/constitution` |
| `src/pages/Contact.jsx` | `POST` | `/contact` |
| `src/pages/Home.jsx` | `GET` | `/leaders/current` |
| `src/pages/Home.jsx` | `GET` | `/policies/public` |
| `src/pages/Polls.jsx` | `GET` | `/polls` |
| `src/pages/Polls.jsx` | `POST` | `/polls` |
| `src/pages/Services.jsx` | `GET` | `/policies/public` |
| `src/pages/VerifyMembership.jsx` | `GET` | `/platform/membership/verify` |
| `src/pages/admin/AdminAccounts.jsx` | `GET` | `/payments/transactions` |
| `src/pages/admin/AdminAccounts.jsx` | `GET` | `/payments/community-assistance/admin` |
| `src/pages/admin/AdminAccounts.jsx` | `GET` | `/admin/members` |
| `src/pages/admin/AdminAccounts.jsx` | `GET` | `/admin/colleagues` |
| `src/pages/admin/AdminAccounts.jsx` | `GET` | `/finance/book-balance` |
| `src/pages/admin/AdminAccounts.jsx` | `GET` | `/finance/constitution-ledger` |
| `src/pages/admin/AdminAccounts.jsx` | `POST` | `/finance` |
| `src/pages/admin/AdminClaims.jsx` | `GET` | `/claims` |
| `src/pages/admin/AdminClaims.jsx` | `GET` | `/payments/community-assistance/admin` |
| `src/pages/admin/AdminClaims.jsx` | `POST` | `/payments/community-assistance` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/finance/summary/dashboard` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/finance` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/contributions` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/payments/community-assistance/admin` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/payments/manual/admin` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/payments/config` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/payments/b2c/history` |
| `src/pages/admin/AdminFinance.jsx` | `GET` | `/payments/transactions` |
| `src/pages/admin/AdminFinance.jsx` | `POST` | `/finance` |
| `src/pages/admin/AdminFinance.jsx` | `POST` | `/contributions/bulk` |
| `src/pages/admin/AdminFinance.jsx` | `POST` | `/payments/b2c/disburse` |
| `src/pages/admin/AdminMessages.jsx` | `GET` | `/member/chat-members` |
| `src/pages/admin/AdminMessages.jsx` | `GET` | `/conversations` |
| `src/pages/admin/AdminReports.jsx` | `GET` | `/admin/reports` |
| `src/pages/admin/AdminReports.jsx` | `POST` | `/news` |
| `src/pages/admin/AdminSupport.jsx` | `GET` | `/contact` |
| `src/pages/admin/AdminSupport.jsx` | `GET` | `/member/support-requests` |
| `src/pages/member/Accounts.jsx` | `GET` | `/member/summary` |
| `src/pages/member/Accounts.jsx` | `GET` | `/payments/mine` |
| `src/pages/member/Accounts.jsx` | `GET` | `/payments/community-assistance` |
| `src/pages/member/Accounts.jsx` | `GET` | `/payments/community-assistance/mine/ledger` |
| `src/pages/member/Accounts.jsx` | `GET` | `/finance/book-balance` |
| `src/pages/member/Accounts.jsx` | `GET` | `/finance/constitution-ledger` |
| `src/pages/member/Claims.jsx` | `GET` | `/member/claims` |
| `src/pages/member/Claims.jsx` | `GET` | `/payments/community-assistance` |
| `src/pages/member/Claims.jsx` | `GET` | `/payments/config` |
| `src/pages/member/Claims.jsx` | `POST` | `/claims/community/request` |
| `src/pages/member/Contributions.jsx` | `GET` | `/member/contributions` |
| `src/pages/member/Dependents.jsx` | `GET` | `/dependents/my` |
| `src/pages/member/Dependents.jsx` | `GET` | `/dependents/edit-requests/mine` |
| `src/pages/member/Dependents.jsx` | `POST` | `/dependents` |
| `src/pages/member/Dependents.jsx` | `POST` | `/dependents/edit-requests` |
| `src/pages/member/MemberDashboard.jsx` | `GET` | `/member/community-stats` |
| `src/pages/member/Messages.jsx` | `GET` | `/member/chat-members` |
| `src/pages/member/Messages.jsx` | `GET` | `/conversations` |
| `src/pages/member/MpesaRecords.jsx` | `GET` | `/payments/mine` |
| `src/pages/member/Notifications.jsx` | `GET` | `/notifications` |
| `src/pages/member/Notifications.jsx` | `PUT` | `/notifications/read-all` |
| `src/pages/member/Notifications.jsx` | `DELETE` | `/notifications/clear` |
| `src/pages/member/Support.jsx` | `GET` | `/dependents/my` |
| `src/pages/member/Support.jsx` | `GET` | `/policies/public` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `GET` | `/payments/transactions` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `GET` | `/payments/community-assistance/admin` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `GET` | `/admin/members` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `GET` | `/admin/colleagues` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `GET` | `/finance/book-balance` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `GET` | `/finance/constitution-ledger` |
| `src/pages/superadmin/SuperAdminAccounts.jsx` | `POST` | `/finance` |
| `src/pages/superadmin/SuperAdminAudit.jsx` | `GET` | `/audit-logs/summary` |
| `src/pages/superadmin/SuperAdminAudit.jsx` | `GET` | `/audit-logs` |
| `src/pages/superadmin/SuperAdminAudit.jsx` | `GET` | `/audit-logs/coverage` |
| `src/pages/superadmin/SuperAdminConstitution.jsx` | `GET` | `/website/constitution` |
| `src/pages/superadmin/SuperAdminConstitution.jsx` | `POST` | `/website/constitution/upload` |
| `src/pages/superadmin/SuperAdminDashboard.jsx` | `GET` | `/superadmin/system/status` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `GET` | `/superadmin/data-integrity` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `GET` | `/superadmin/data-integrity/members-reconciliation` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `GET` | `/superadmin/data-integrity/backup/human` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `GET` | `/superadmin/data-integrity/backup/human/print` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `GET` | `/superadmin/data-integrity/backup` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `GET` | `/superadmin/data-integrity/print-database` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `POST` | `/superadmin/data-integrity/cleanup/carousels/deep` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `POST` | `/superadmin/data-integrity/cleanup/carousels` |
| `src/pages/superadmin/SuperAdminDataIntegrity.jsx` | `POST` | `/superadmin/data-integrity/cleanup` |
| `src/pages/superadmin/SuperAdminPolicies.jsx` | `GET` | `/policies/admin` |
| `src/pages/superadmin/SuperAdminPolicies.jsx` | `POST` | `/policies` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `GET` | `/website` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `GET` | `/carousel` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `GET` | `/leaders` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `GET` | `/website/gallery` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `GET` | `/website/settings` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `GET` | `/superadmin/settings` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `POST` | `/website` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `PUT` | `/superadmin/settings` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `PUT` | `/website/settings` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `POST` | `/website` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `POST` | `/carousel/upload` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `POST` | `/website/gallery/upload` |
| `src/pages/superadmin/SuperAdminSettings.jsx` | `POST` | `/leaders/upload` |
| `src/pages/superadmin/SuperAdminSystem.jsx` | `GET` | `/health` |
| `src/services/adminService.js` | `GET` | `/admin/dashboard` |
| `src/services/adminService.js` | `GET` | `/admin/members/statistics` |
| `src/services/adminService.js` | `GET` | `/admin/members/recent` |
| `src/services/adminService.js` | `GET` | `/admin/members/filter` |
| `src/services/adminService.js` | `GET` | `/admin/members/monthly-registrations` |
| `src/services/adminService.js` | `GET` | `/admin/members/contribution-summary` |
| `src/services/adminService.js` | `GET` | `/admin/members` |
| `src/services/adminService.js` | `POST` | `/admin/members` |
| `src/services/adminService.js` | `GET` | `/superadmin/admins` |
| `src/services/adminService.js` | `POST` | `/superadmin/admins` |
| `src/services/adminService.js` | `GET` | `/superadmin/admins/statistics` |
| `src/services/adminService.js` | `GET` | `/admin/profile` |
| `src/services/adminService.js` | `PUT` | `/admin/profile` |
| `src/services/adminService.js` | `PUT` | `/admin/change-password` |
| `src/services/adminService.js` | `GET` | `/admin/settings` |
| `src/services/adminService.js` | `PUT` | `/admin/settings` |
| `src/services/adminService.js` | `GET` | `/admin/colleagues` |
| `src/services/authService.js` | `GET` | `/auth/csrf` |
| `src/services/authService.js` | `POST` | `/auth/login` |
| `src/services/authService.js` | `GET` | `/auth/me` |
| `src/services/authService.js` | `POST` | `/auth/logout` |
| `src/services/feedbackService.js` | `GET` | `/feedback` |
| `src/services/feedbackService.js` | `GET` | `/feedback/pending/login` |
| `src/services/feedbackService.js` | `POST` | `/feedback` |
| `src/services/feedbackService.js` | `POST` | `/feedback/built-in` |
| `src/services/feedbackService.js` | `POST` | `/feedback/auto-generate` |
| `src/services/memberService.js` | `GET` | `/member/dashboard` |
| `src/services/memberService.js` | `GET` | `/member/profile` |
| `src/services/memberService.js` | `PUT` | `/member/profile` |
| `src/services/memberService.js` | `PUT` | `/member/profile` |
| `src/services/memberService.js` | `GET` | `/member/summary` |
| `src/services/memberService.js` | `GET` | `/member/profile-status` |
| `src/services/memberService.js` | `GET` | `/member/eligibility` |
| `src/services/memberService.js` | `GET` | `/member/settings` |
| `src/services/memberService.js` | `PUT` | `/member/settings` |
| `src/services/memberService.js` | `PUT` | `/member/change-password` |
| `src/services/memberService.js` | `GET` | `/member/contributions` |
| `src/services/memberService.js` | `GET` | `/member/finance` |
| `src/services/memberService.js` | `GET` | `/member/benefits` |
| `src/services/memberService.js` | `GET` | `/member/eligibility` |
| `src/services/memberService.js` | `GET` | `/member/claims` |
| `src/services/memberService.js` | `POST` | `/member/support-requests` |
| `src/services/memberService.js` | `GET` | `/dependents/my` |
| `src/services/memberService.js` | `GET` | `/news` |
| `src/services/memberService.js` | `GET` | `/polls` |
| `src/services/newsService.js` | `GET` | `/news` |
| `src/services/newsService.js` | `POST` | `/news` |
| `src/services/runtimeConfig.js` | `GET` | `/payments/public-config` |
| `src/services/runtimeConfig.js` | `GET` | `/platform/runtime-config` |
| `src/services/superAdminService.js` | `GET` | `/superadmin/admins/statistics` |
| `src/services/superAdminService.js` | `GET` | `/superadmin/admins` |
| `src/services/superAdminService.js` | `POST` | `/superadmin/admins` |
| `src/services/superAdminService.js` | `GET` | `/superadmin/profile` |
| `src/services/superAdminService.js` | `PUT` | `/superadmin/profile` |
| `src/services/superAdminService.js` | `PUT` | `/superadmin/change-password` |
| `src/services/superAdminService.js` | `GET` | `/superadmin/settings` |
| `src/services/superAdminService.js` | `PUT` | `/superadmin/settings` |
| `src/services/superAdminService.js` | `GET` | `/superadmin/overview` |
| `src/sockets/socket.js` | `GET` | `/auth/socket-ticket` |

## Portal/menu route inventory
- `/admin`
- `/admin/accounts`
- `/admin/accounts?tab=contributions`
- `/admin/accounts?tab=mpesa`
- `/admin/announcements`
- `/admin/claims`
- `/admin/communications`
- `/admin/feedback`
- `/admin/finance`
- `/admin/finance-center`
- `/admin/leadership`
- `/admin/leadership?view=governance`
- `/admin/members`
- `/admin/members?view=pending`
- `/admin/messages`
- `/admin/notifications`
- `/admin/operations`
- `/admin/polls`
- `/admin/reports`
- `/admin/reports?report=claims`
- `/admin/reports?report=finance`
- `/admin/reports?report=members`
- `/admin/reports?report=support`
- `/admin/settings`
- `/admin/support`
- `/admin/website`
- `/constitution`
- `/contact`
- `/leaders`
- `/member`
- `/member/account`
- `/member/accounts`
- `/member/announcements`
- `/member/benefits`
- `/member/claims`
- `/member/community`
- `/member/contributions`
- `/member/dependents`
- `/member/feedback`
- `/member/guide`
- `/member/help`
- `/member/messages`
- `/member/money`
- `/member/mpesa-records`
- `/member/notifications`
- `/member/polls`
- `/member/profile`
- `/member/profile#documents`
- `/member/settings`
- `/member/support`
- `/member/support-center`
- `/member/support?view=requests`
- `/superadmin`
- `/superadmin/accounts`
- `/superadmin/admins`
- `/superadmin/audit`
- `/superadmin/claims`
- `/superadmin/communications`
- `/superadmin/constitution`
- `/superadmin/data-integrity`
- `/superadmin/feedback`
- `/superadmin/finance-center`
- `/superadmin/governance`
- `/superadmin/leaders`
- `/superadmin/members`
- `/superadmin/news`
- `/superadmin/notifications`
- `/superadmin/password`
- `/superadmin/people`
- `/superadmin/policies`
- `/superadmin/reports`
- `/superadmin/settings`
- `/superadmin/settings-center`
- `/superadmin/settings?tab=branding`
- `/superadmin/settings?tab=security`
- `/superadmin/support`
- `/superadmin/system`
- `/superadmin/system-center`

## Socket event inventory
### Backend listeners
- `call-answer`
- `call-mode-answer`
- `call-mode-offer`
- `call-rejected`
- `call-user`
- `connection`
- `delete-notification`
- `disconnect`
- `end-call`
- `get-notification-count`
- `get-poll-results`
- `ice-candidate`
- `join-conversation`
- `join-news`
- `join-polls`
- `leave-conversation`
- `news-commented`
- `news-created`
- `news-deleted`
- `news-liked`
- `news-updated`
- `news-viewed`
- `notification-read`
- `notification-register`
- `poll-closed`
- `poll-created`
- `poll-deleted`
- `poll-opened`
- `poll-updated`
- `poll-voted`
- `presence-heartbeat`
- `read-all-notifications`
- `seen-message`
- `stop-typing`
- `typing`
- `user-online`
### Frontend listeners
- `call-answered`
- `call-ended`
- `call-mode-answer`
- `call-mode-offer`
- `call-rejected`
- `call-started`
- `connect`
- `connect_error`
- `disconnect`
- `ice-candidate`
- `message-deleted`
- `message-seen`
- `new-message`
- `new-notification`
- `notification-deleted`
- `notification-updated`
- `notifications-cleared`
- `presence-required`
- `session-replaced`
- `stop-typing`
- `typing`

## Role/security source notes
- Members are restricted to member-scoped endpoints; direct existing-dependent mutation routes require `isAdminOrSuperAdmin`.
- Admin portal exposes member oversight, finance, reports, support/claims, announcements, notifications and member/admin chat. Member/admin chat uses the shared chat identity; SuperAdmin is excluded from `isChatUser`.
- SuperAdmin has separate people/governance/finance/communications/system/settings sections and no dedicated messaging route. Data-integrity tooling may still inspect legacy chat records because that is governance/cleanup, not a chat UI.
