# Benevolent MIDAX internal route/API/role/socket audit map

## React routes (App.jsx)
<Route path="/resources" element={<Navigate to="/news?tab=resources" replace />} />
<Route path="/events" element={<Navigate to="/news?tab=events" replace />} />
<Navigate to="/login" replace />
<Route path="/verify-membership" element={<VerifyMembership />} />
<Route path="/member/account" element={<ProtectedRoute allowedRoles={["member"]}><PortalSectionPage role="member" sectionKey="account" /></ProtectedRoute>} />
<Route path="/member/money" element={<ProtectedRoute allowedRoles={["member"]}><PortalSectionPage role="member" sectionKey="money" /></ProtectedRoute>} />
<Route path="/member/support-center" element={<ProtectedRoute allowedRoles={["member"]}><PortalSectionPage role="member" sectionKey="support" /></ProtectedRoute>} />
<Route path="/member/community" element={<ProtectedRoute allowedRoles={["member"]}><PortalSectionPage role="member" sectionKey="community" /></ProtectedRoute>} />
<Route path="/member/help" element={<ProtectedRoute allowedRoles={["member"]}><PortalSectionPage role="member" sectionKey="help" /></ProtectedRoute>} />
<Route path="/admin/operations" element={<ProtectedRoute allowedRoles={["admin","superadmin"]}><PortalSectionPage role="admin" sectionKey="operations" /></ProtectedRoute>} />
<Route path="/admin/finance-center" element={<ProtectedRoute allowedRoles={["admin"]}><PortalSectionPage role="admin" sectionKey="finance" /></ProtectedRoute>} />
<Route path="/admin/communications" element={<ProtectedRoute allowedRoles={["admin"]}><PortalSectionPage role="admin" sectionKey="communications" /></ProtectedRoute>} />
<Route path="/admin/leadership" element={<ProtectedRoute allowedRoles={["admin"]}><PortalSectionPage role="admin" sectionKey="leadership" /></ProtectedRoute>} />
<Route path="/superadmin/people" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSectionPage role="superadmin" sectionKey="people" /></ProtectedRoute>} />
<Route path="/superadmin/governance" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSectionPage role="superadmin" sectionKey="governance" /></ProtectedRoute>} />
<Route path="/superadmin/finance-center" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSectionPage role="superadmin" sectionKey="finance" /></ProtectedRoute>} />
<Route path="/superadmin/communications" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSectionPage role="superadmin" sectionKey="communications" /></ProtectedRoute>} />
<Route path="/superadmin/system-center" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSectionPage role="superadmin" sectionKey="system" /></ProtectedRoute>} />
<Route path="/superadmin/settings-center" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSectionPage role="superadmin" sectionKey="settings" /></ProtectedRoute>} />
<Route path="/admin/platform" element={<ProtectedRoute allowedRoles={["admin","superadmin"]}><Navigate to="/admin" replace /></ProtectedRoute>} />
<Route path="/admin/accounts" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAccounts /></ProtectedRoute>} />
<Route path="/admin/finance" element={<Navigate to="/admin/accounts" replace />} />
<Route path="/admin/claims" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminClaims /></ProtectedRoute>} />
<Route path="/admin/support" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminSupport /></ProtectedRoute>} />
<Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMessages /></ProtectedRoute>} />
<Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><AdminNotifications /></ProtectedRoute>} />
<Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnnouncements /></ProtectedRoute>} />
<Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><PortalSettings /></ProtectedRoute>} />
<Route path="/admin/website" element={<ProtectedRoute allowedRoles={["admin"]}><AdminWebsite /></ProtectedRoute>} />
<Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReports /></ProtectedRoute>} />
<Route path="/superadmin/reports" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminReports /></ProtectedRoute>} />
<Route path="/admin/polls" element={<ProtectedRoute allowedRoles={["admin"]}><Polls mode="admin" /></ProtectedRoute>} />
<Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={["admin"]}><Feedback /></ProtectedRoute>} />
<Route path="/member/platform" element={<ProtectedRoute allowedRoles={["member"]}><Navigate to="/member" replace /></ProtectedRoute>} />
<Route path="/member/accounts" element={<ProtectedRoute allowedRoles={["member"]}><MemberAccounts /></ProtectedRoute>} />
<Route path="/member/contributions" element={<ProtectedRoute allowedRoles={["member"]}><Contributions /></ProtectedRoute>} />
<Route path="/member/dependents" element={<ProtectedRoute allowedRoles={["member"]}><Dependents /></ProtectedRoute>} />
<Route path="/member/guide" element={<ProtectedRoute allowedRoles={["member"]}><PortalGuide /></ProtectedRoute>} />
<Route path="/member/polls" element={<ProtectedRoute allowedRoles={["member"]}><Polls mode="member" /></ProtectedRoute>} />
<Route path="/member/mpesa-records" element={<ProtectedRoute allowedRoles={["member"]}><MpesaRecords /></ProtectedRoute>} />
<Route path="/member/feedback" element={<ProtectedRoute allowedRoles={["member"]}><Feedback /></ProtectedRoute>} />
<Route path="/superadmin/platform" element={<ProtectedRoute allowedRoles={["superadmin"]}><Navigate to="/superadmin" replace /></ProtectedRoute>} />
<Route path="/superadmin/members" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminMembers /></ProtectedRoute>} />
<Route path="/superadmin/accounts" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminAccounts /></ProtectedRoute>} />
<Route path="/superadmin/finance" element={<Navigate to="/superadmin/accounts" replace />} />
<Route path="/superadmin/audit" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminAudit /></ProtectedRoute>} />
<Route path="/superadmin/notifications" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminNotifications /></ProtectedRoute>} />
<Route path="/superadmin/news" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminNews /></ProtectedRoute>} />
<Route path="/superadmin/claims" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminClaims /></ProtectedRoute>} />
<Route path="/superadmin/support" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminSupport /></ProtectedRoute>} />
<Route path="/superadmin/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSettings /></ProtectedRoute>} />
<Route path="/superadmin/leaders" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSettings initialTab="leaders" /></ProtectedRoute>} />
<Route path="/superadmin/policies" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminPolicies /></ProtectedRoute>} />
<Route path="/superadmin/password" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSettings /></ProtectedRoute>} />
<Route path="/superadmin/data-integrity" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDataIntegrity /></ProtectedRoute>} />
<Route path="/superadmin/system" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSystem /></ProtectedRoute>} />
<Route path="/superadmin/constitution" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminConstitution /></ProtectedRoute>} />
<Route path="/superadmin/polls" element={<ProtectedRoute allowedRoles={["superadmin"]}><Polls mode="superadmin" /></ProtectedRoute>} />
<Route path="/superadmin/feedback" element={<ProtectedRoute allowedRoles={["superadmin"]}><Feedback /></ProtectedRoute>} />
<Route path="*" element={<NotFound />} />

## Backend mounts (server.js)
app.use("/api/auth", authRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/dependents", dependentRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/medical", medicalSupportRoutes);
app.use("/api/funeral", funeralSupportRoutes);
app.use("/api/education", educationSupportRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/member/support-requests", supportRequestRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/leaders", leaderRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/website", websiteRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/superadmin/data-integrity", dataIntegrityRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/claims", claimWorkflowRoutes);

## Frontend API calls
- src/components/LegalSectionPage.jsx | GET | /website/${section}
- src/components/NotificationSettings.jsx | GET | /notifications/push/vapid-public-key
- src/components/NotificationSettings.jsx | POST | /notifications/push/subscribe
- src/components/ThemeBootstrap.jsx | GET | /website/settings
- src/components/admin/DependentManagementPanel.jsx | DELETE | /dependents/${dependent._id}
- src/components/admin/DependentManagementPanel.jsx | GET | /dependents/admin/member/${member._id}
- src/components/admin/DependentManagementPanel.jsx | GET | /dependents/edit-requests/admin?memberId=${member._id}
- src/components/admin/DependentManagementPanel.jsx | PATCH | /dependents/${dependentId}/documents/${documentId}/verify
- src/components/admin/DependentManagementPanel.jsx | POST | /dependents/${id}/documents
- src/components/admin/DependentManagementPanel.jsx | POST | /dependents/edit-requests/${requestId}/review
- src/components/admin/DependentManagementPanel.jsx | PUT | /dependents/${editing}
- src/components/admin/DependentManagementPanel.jsx | PUT | /dependents/${id}/verify
- src/components/chat/ChatWindow.jsx | DELETE | /conversations/${conversation._id}
- src/components/chat/ChatWindow.jsx | GET | /messages/conversation/${conversation._id}
- src/components/chat/ChatWindow.jsx | POST | /messages
- src/components/chat/ChatWindow.jsx | PUT | /conversations/${conversation._id}/${endpoint}
- src/components/chat/ChatWindow.jsx | PUT | /conversations/${conversation._id}/read
- src/components/chat/ChatWindow.jsx | PUT | /messages/${normalized._id}/read
- src/components/chat/MessageCenterPage.jsx | GET | /auth/me
- src/components/chat/MessageCenterPage.jsx | GET | /conversations/${person.conversationId}
- src/components/chat/MessageCenterPage.jsx | POST | /conversations
- src/components/chat/MessageInput.jsx | POST | /messages/upload
- src/components/dashboard/ChatPreview.jsx | GET | /conversations
- src/components/dashboard/DashboardTopbar.jsx | GET | /conversations
- src/components/dashboard/DashboardTopbar.jsx | GET | /notifications/unread-count
- src/components/member/CommunityFeed.jsx | GET | /news/public
- src/components/member/MembershipCard.jsx | GET | /platform/membership-card
- src/components/member/NotificationCenter.jsx | GET | /notifications
- src/components/member/RecentChats.jsx | GET | /conversations
- src/components/payments/MpesaPaymentButton.jsx | GET | /payments/config
- src/components/payments/MpesaPaymentButton.jsx | GET | /payments/transactions/${transactionId}
- src/components/payments/MpesaPaymentButton.jsx | POST | /payments/manual
- src/components/payments/MpesaPaymentButton.jsx | POST | /payments/stk
- src/components/payments/MpesaPaymentButton.jsx | POST | /payments/stk-query
- src/context/AuthContext.jsx | GET | /notifications/push/vapid-public-key
- src/context/AuthContext.jsx | POST | /notifications/push/subscribe
- src/hooks/usePublicSettings.js | GET | /website/settings
- src/main.jsx | GET | /notifications/push/vapid-public-key
- src/main.jsx | POST | /notifications/push/subscribe
- src/pages/About.jsx | GET | /website
- src/pages/Constitution.jsx | GET | /website/constitution
- src/pages/Contact.jsx | POST | /contact
- src/pages/Home.jsx | GET | /leaders/current
- src/pages/Home.jsx | GET | /policies/public
- src/pages/Polls.jsx | DELETE | /polls/${pollId}
- src/pages/Polls.jsx | GET | /polls
- src/pages/Polls.jsx | GET | /polls/${pollId}/results
- src/pages/Polls.jsx | POST | /polls
- src/pages/Polls.jsx | POST | /votes/${pollId}
- src/pages/Services.jsx | GET | /policies/public
- src/pages/VerifyMembership.jsx | GET | /platform/membership/verify
- src/pages/admin/AdminAccounts.jsx | DELETE | /finance/${row._id}
- src/pages/admin/AdminAccounts.jsx | DELETE | /payments/community-assistance/${c._id}
- src/pages/admin/AdminAccounts.jsx | DELETE | /payments/transactions/${tx._id}
- src/pages/admin/AdminAccounts.jsx | GET | /admin/colleagues
- src/pages/admin/AdminAccounts.jsx | GET | /admin/members
- src/pages/admin/AdminAccounts.jsx | GET | /finance/book-balance
- src/pages/admin/AdminAccounts.jsx | GET | /finance/constitution-ledger
- src/pages/admin/AdminAccounts.jsx | GET | /payments/community-assistance/admin
- src/pages/admin/AdminAccounts.jsx | GET | /payments/transactions
- src/pages/admin/AdminAccounts.jsx | POST | /finance
- src/pages/admin/AdminAccounts.jsx | POST | /finance/${tx._id}/attachment
- src/pages/admin/AdminAccounts.jsx | POST | /payments/community-assistance/${c._id}/close
- src/pages/admin/AdminAccounts.jsx | POST | /payments/community-assistance/${c._id}/payout
- src/pages/admin/AdminAccounts.jsx | POST | /payments/transactions/${tx._id}/cancel
- src/pages/admin/AdminAccounts.jsx | PUT | /finance/${editing._id}
- src/pages/admin/AdminClaims.jsx | DELETE | /claims/${c.sourceType}/${c._id}
- src/pages/admin/AdminClaims.jsx | GET | /claims
- src/pages/admin/AdminClaims.jsx | GET | /payments/community-assistance/admin
- src/pages/admin/AdminClaims.jsx | POST | /claims/${c.sourceType}/${c._id}/publish-news
- src/pages/admin/AdminClaims.jsx | POST | /claims/community/${c._id}/publish-news
- src/pages/admin/AdminClaims.jsx | POST | /payments/community-assistance
- src/pages/admin/AdminClaims.jsx | POST | /payments/community-assistance/${campaign._id}/close
- src/pages/admin/AdminClaims.jsx | POST | /payments/community-assistance/${campaign._id}/payout
- src/pages/admin/AdminClaims.jsx | PUT | /claims/${c.sourceType}/${c._id}/stage
- src/pages/admin/AdminClaims.jsx | PUT | /claims/${selected.sourceType}/${selected._id}/stage
- src/pages/admin/AdminFinance.jsx | DELETE | /finance/${transaction._id}
- src/pages/admin/AdminFinance.jsx | DELETE | /payments/transactions/${transaction._id}
- src/pages/admin/AdminFinance.jsx | GET | /contributions
- src/pages/admin/AdminFinance.jsx | GET | /finance
- src/pages/admin/AdminFinance.jsx | GET | /finance/ledger?year=${new Date().getFullYear()}
- src/pages/admin/AdminFinance.jsx | GET | /finance/summary/dashboard
- src/pages/admin/AdminFinance.jsx | GET | /payments/b2c/history
- src/pages/admin/AdminFinance.jsx | GET | /payments/community-assistance/admin
- src/pages/admin/AdminFinance.jsx | GET | /payments/config
- src/pages/admin/AdminFinance.jsx | GET | /payments/manual/admin
- src/pages/admin/AdminFinance.jsx | GET | /payments/transactions
- src/pages/admin/AdminFinance.jsx | PATCH | /finance/${transaction._id}/visibility
- src/pages/admin/AdminFinance.jsx | POST | /contributions/bulk
- src/pages/admin/AdminFinance.jsx | POST | /finance
- src/pages/admin/AdminFinance.jsx | POST | /payments/b2c/disburse
- src/pages/admin/AdminFinance.jsx | POST | /payments/community-assistance/${campaign._id}/close
- src/pages/admin/AdminFinance.jsx | POST | /payments/community-assistance/${campaign._id}/payout
- src/pages/admin/AdminFinance.jsx | PUT | /contributions/${editingContribution._id}
- src/pages/admin/AdminFinance.jsx | PUT | /finance/${editing._id}
- src/pages/admin/AdminMessages.jsx | GET | /conversations
- src/pages/admin/AdminMessages.jsx | GET | /member/chat-members
- src/pages/admin/AdminReports.jsx | GET | /admin/reports
- src/pages/admin/AdminReports.jsx | GET | /admin/reports/export.${kind}
- src/pages/admin/AdminReports.jsx | POST | /news
- src/pages/admin/AdminSupport.jsx | DELETE | /contact/${id}
- src/pages/admin/AdminSupport.jsx | DELETE | /member/support-requests/${id}
- src/pages/admin/AdminSupport.jsx | GET | /contact
- src/pages/admin/AdminSupport.jsx | GET | /member/support-requests
- src/pages/member/Accounts.jsx | GET | /finance/book-balance
- src/pages/member/Accounts.jsx | GET | /finance/constitution-ledger
- src/pages/member/Accounts.jsx | GET | /member/summary
- src/pages/member/Accounts.jsx | GET | /payments/community-assistance
- src/pages/member/Accounts.jsx | GET | /payments/community-assistance/mine/ledger
- src/pages/member/Accounts.jsx | GET | /payments/mine
- src/pages/member/Claims.jsx | GET | /member/claims
- src/pages/member/Claims.jsx | GET | /payments/community-assistance
- src/pages/member/Claims.jsx | GET | /payments/config
- src/pages/member/Claims.jsx | POST | /claims/community/request
- src/pages/member/Contributions.jsx | GET | /member/contributions
- src/pages/member/Dependents.jsx | GET | /dependents/edit-requests/mine
- src/pages/member/Dependents.jsx | GET | /dependents/my
- src/pages/member/Dependents.jsx | POST | /dependents
- src/pages/member/Dependents.jsx | POST | /dependents/${dependentId}/documents
- src/pages/member/Dependents.jsx | POST | /dependents/edit-requests
- src/pages/member/MemberDashboard.jsx | GET | /member/community-stats
- src/pages/member/MemberDashboard.jsx | GET | /member/contributions?year=${new Date().getFullYear()}
- src/pages/member/Messages.jsx | GET | /conversations
- src/pages/member/Messages.jsx | GET | /member/chat-members
- src/pages/member/MpesaRecords.jsx | GET | /payments/mine
- src/pages/member/Notifications.jsx | DELETE | /notifications/clear
- src/pages/member/Notifications.jsx | GET | /notifications
- src/pages/member/Notifications.jsx | PUT | /notifications/${id}/read
- src/pages/member/Notifications.jsx | PUT | /notifications/read-all
- src/pages/member/Support.jsx | DELETE | /member/support-requests/mine/${claim._id}
- src/pages/member/Support.jsx | GET | /dependents/my
- src/pages/member/Support.jsx | GET | /policies/public
- src/pages/member/Support.jsx | PUT | /member/support-requests/mine/${editingRequest._id}
- src/pages/superadmin/SuperAdminAccounts.jsx | DELETE | /finance/${row._id}
- src/pages/superadmin/SuperAdminAccounts.jsx | DELETE | /payments/community-assistance/${c._id}
- src/pages/superadmin/SuperAdminAccounts.jsx | DELETE | /payments/transactions/${tx._id}
- src/pages/superadmin/SuperAdminAccounts.jsx | GET | /admin/colleagues
- src/pages/superadmin/SuperAdminAccounts.jsx | GET | /admin/members
- src/pages/superadmin/SuperAdminAccounts.jsx | GET | /finance/book-balance
- src/pages/superadmin/SuperAdminAccounts.jsx | GET | /finance/constitution-ledger
- src/pages/superadmin/SuperAdminAccounts.jsx | GET | /payments/community-assistance/admin
- src/pages/superadmin/SuperAdminAccounts.jsx | GET | /payments/transactions
- src/pages/superadmin/SuperAdminAccounts.jsx | POST | /finance
- src/pages/superadmin/SuperAdminAccounts.jsx | POST | /finance/${tx._id}/attachment
- src/pages/superadmin/SuperAdminAccounts.jsx | POST | /payments/community-assistance/${c._id}/close
- src/pages/superadmin/SuperAdminAccounts.jsx | POST | /payments/community-assistance/${c._id}/payout
- src/pages/superadmin/SuperAdminAccounts.jsx | POST | /payments/manual/${tx._id}/${action===
- src/pages/superadmin/SuperAdminAccounts.jsx | PUT | /finance/${editing._id}
- src/pages/superadmin/SuperAdminAudit.jsx | DELETE | /audit-logs/${id}
- src/pages/superadmin/SuperAdminAudit.jsx | GET | /audit-logs
- src/pages/superadmin/SuperAdminAudit.jsx | GET | /audit-logs/coverage
- src/pages/superadmin/SuperAdminAudit.jsx | GET | /audit-logs/summary
- src/pages/superadmin/SuperAdminConstitution.jsx | GET | /website/constitution
- src/pages/superadmin/SuperAdminConstitution.jsx | POST | /website/constitution/upload
- src/pages/superadmin/SuperAdminDashboard.jsx | GET | /superadmin/system/status
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | DELETE | /superadmin/data-integrity/members/${memberId}
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | GET | /superadmin/data-integrity
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | GET | /superadmin/data-integrity/backup
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | GET | /superadmin/data-integrity/backup/human
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | GET | /superadmin/data-integrity/backup/human/print
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | GET | /superadmin/data-integrity/members-reconciliation
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | GET | /superadmin/data-integrity/print-database
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | POST | /superadmin/data-integrity/cleanup
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | POST | /superadmin/data-integrity/cleanup/carousels
- src/pages/superadmin/SuperAdminDataIntegrity.jsx | POST | /superadmin/data-integrity/cleanup/carousels/deep
- src/pages/superadmin/SuperAdminPolicies.jsx | DELETE | /policies/${id}
- src/pages/superadmin/SuperAdminPolicies.jsx | GET | /policies/admin
- src/pages/superadmin/SuperAdminPolicies.jsx | POST | /policies
- src/pages/superadmin/SuperAdminPolicies.jsx | PUT | /policies/${editing}
- src/pages/superadmin/SuperAdminSettings.jsx | DELETE | /carousel/${slideId}
- src/pages/superadmin/SuperAdminSettings.jsx | DELETE | /leaders/${leaderId}
- src/pages/superadmin/SuperAdminSettings.jsx | GET | /carousel
- src/pages/superadmin/SuperAdminSettings.jsx | GET | /leaders
- src/pages/superadmin/SuperAdminSettings.jsx | GET | /superadmin/settings
- src/pages/superadmin/SuperAdminSettings.jsx | GET | /website
- src/pages/superadmin/SuperAdminSettings.jsx | GET | /website/gallery
- src/pages/superadmin/SuperAdminSettings.jsx | GET | /website/settings
- src/pages/superadmin/SuperAdminSettings.jsx | POST | /carousel/upload
- src/pages/superadmin/SuperAdminSettings.jsx | POST | /leaders/upload
- src/pages/superadmin/SuperAdminSettings.jsx | POST | /website
- src/pages/superadmin/SuperAdminSettings.jsx | POST | /website/gallery/upload
- src/pages/superadmin/SuperAdminSettings.jsx | PUT | /carousel/${slideId}
- src/pages/superadmin/SuperAdminSettings.jsx | PUT | /leaders/${leaderDraft._id}
- src/pages/superadmin/SuperAdminSettings.jsx | PUT | /superadmin/settings
- src/pages/superadmin/SuperAdminSettings.jsx | PUT | /website/${key}
- src/pages/superadmin/SuperAdminSettings.jsx | PUT | /website/settings
- src/pages/superadmin/SuperAdminSystem.jsx | GET | /health
- src/services/adminService.js | DELETE | /admin/members/${memberId}
- src/services/adminService.js | DELETE | /superadmin/admins/${adminId}
- src/services/adminService.js | GET | /admin/colleagues
- src/services/adminService.js | GET | /admin/dashboard
- src/services/adminService.js | GET | /admin/members
- src/services/adminService.js | GET | /admin/members/${memberId}
- src/services/adminService.js | GET | /admin/members/contribution-summary
- src/services/adminService.js | GET | /admin/members/filter
- src/services/adminService.js | GET | /admin/members/monthly-registrations
- src/services/adminService.js | GET | /admin/members/recent
- src/services/adminService.js | GET | /admin/members/statistics
- src/services/adminService.js | GET | /admin/profile
- src/services/adminService.js | GET | /admin/settings
- src/services/adminService.js | GET | /superadmin/admins
- src/services/adminService.js | GET | /superadmin/admins/${adminId}
- src/services/adminService.js | GET | /superadmin/admins/statistics
- src/services/adminService.js | PATCH | /admin/members/${memberId}/activate
- src/services/adminService.js | PATCH | /admin/members/${memberId}/reset-password
- src/services/adminService.js | PATCH | /admin/members/${memberId}/restore
- src/services/adminService.js | PATCH | /admin/members/${memberId}/suspend
- src/services/adminService.js | PATCH | /admin/members/${memberId}/verify
- src/services/adminService.js | PATCH | /superadmin/admins/${adminId}/activate
- src/services/adminService.js | PATCH | /superadmin/admins/${adminId}/reset-password
- src/services/adminService.js | PATCH | /superadmin/admins/${adminId}/suspend
- src/services/adminService.js | POST | /admin/members
- src/services/adminService.js | POST | /superadmin/admins
- src/services/adminService.js | PUT | /admin/change-password
- src/services/adminService.js | PUT | /admin/members/${memberId}
- src/services/adminService.js | PUT | /admin/profile
- src/services/adminService.js | PUT | /admin/settings
- src/services/adminService.js | PUT | /superadmin/admins/${adminId}
- src/services/authService.js | GET | /auth/csrf
- src/services/authService.js | GET | /auth/me
- src/services/authService.js | POST | /auth/login
- src/services/authService.js | POST | /auth/logout
- src/services/feedbackService.js | DELETE | /feedback/${id}
- src/services/feedbackService.js | GET | /feedback
- src/services/feedbackService.js | GET | /feedback/${id}/export
- src/services/feedbackService.js | GET | /feedback/${id}/responses
- src/services/feedbackService.js | GET | /feedback/pending/login
- src/services/feedbackService.js | GET | /feedback/published/${id}/download
- src/services/feedbackService.js | POST | /feedback
- src/services/feedbackService.js | POST | /feedback/${id}/import
- src/services/feedbackService.js | POST | /feedback/${id}/publish-news
- src/services/feedbackService.js | POST | /feedback/${id}/responses
- src/services/feedbackService.js | POST | /feedback/auto-generate
- src/services/feedbackService.js | POST | /feedback/built-in
- src/services/feedbackService.js | PUT | /feedback/${id}
- src/services/memberService.js | GET | /dependents/my
- src/services/memberService.js | GET | /member/benefits
- src/services/memberService.js | GET | /member/claims
- src/services/memberService.js | GET | /member/contributions
- src/services/memberService.js | GET | /member/dashboard
- src/services/memberService.js | GET | /member/eligibility
- src/services/memberService.js | GET | /member/finance
- src/services/memberService.js | GET | /member/profile
- src/services/memberService.js | GET | /member/profile-status
- src/services/memberService.js | GET | /member/settings
- src/services/memberService.js | GET | /member/summary
- src/services/memberService.js | GET | /news
- src/services/memberService.js | GET | /polls
- src/services/memberService.js | POST | /member/support-requests
- src/services/memberService.js | POST | /votes/${pollId}
- src/services/memberService.js | PUT | /member/change-password
- src/services/memberService.js | PUT | /member/profile
- src/services/memberService.js | PUT | /member/settings
- src/services/newsService.js | DELETE | /news/${id}
- src/services/newsService.js | GET | /news
- src/services/newsService.js | POST | /news
- src/services/newsService.js | POST | /news/${id}/publish
- src/services/newsService.js | POST | /news/${id}/unpublish
- src/services/newsService.js | PUT | /news/${id}
- src/services/runtimeConfig.js | GET | /payments/public-config
- src/services/runtimeConfig.js | GET | /platform/runtime-config
- src/services/superAdminService.js | DELETE | /superadmin/admins/${adminId}
- src/services/superAdminService.js | GET | /superadmin/admins
- src/services/superAdminService.js | GET | /superadmin/admins/${adminId}
- src/services/superAdminService.js | GET | /superadmin/admins/statistics
- src/services/superAdminService.js | GET | /superadmin/overview
- src/services/superAdminService.js | GET | /superadmin/profile
- src/services/superAdminService.js | GET | /superadmin/settings
- src/services/superAdminService.js | PATCH | /superadmin/admins/${adminId}/activate
- src/services/superAdminService.js | PATCH | /superadmin/admins/${adminId}/reset-password
- src/services/superAdminService.js | PATCH | /superadmin/admins/${adminId}/suspend
- src/services/superAdminService.js | POST | /superadmin/admins
- src/services/superAdminService.js | PUT | /superadmin/admins/${adminId}
- src/services/superAdminService.js | PUT | /superadmin/change-password
- src/services/superAdminService.js | PUT | /superadmin/profile
- src/services/superAdminService.js | PUT | /superadmin/settings
- src/sockets/socket.js | GET | /auth/socket-ticket

## Socket events
- frontend src/context/SocketContext.jsx | emit | user-online
- frontend src/context/SocketContext.jsx | emit | presence-heartbeat
- frontend src/context/SocketContext.jsx | emit | presence-heartbeat
- frontend src/context/SocketContext.jsx | on | session-replaced
- frontend src/context/SocketContext.jsx | on | connect
- frontend src/context/SocketContext.jsx | on | presence-required
- frontend src/context/SocketContext.jsx | off | session-replaced
- frontend src/context/SocketContext.jsx | off | connect
- frontend src/context/SocketContext.jsx | off | presence-required
- frontend src/sockets/socket.js | on | connect_error
- frontend src/sockets/socket.js | on | session-replaced
- frontend src/pages/member/Notifications.jsx | emit | notification-register
- frontend src/pages/member/Notifications.jsx | emit | get-notification-count
- frontend src/pages/member/Notifications.jsx | on | connect
- frontend src/pages/member/Notifications.jsx | on | new-notification
- frontend src/pages/member/Notifications.jsx | on | notification-updated
- frontend src/pages/member/Notifications.jsx | on | notification-deleted
- frontend src/pages/member/Notifications.jsx | on | notifications-cleared
- frontend src/pages/member/Notifications.jsx | off | connect
- frontend src/pages/member/Notifications.jsx | off | new-notification
- frontend src/pages/member/Notifications.jsx | off | notification-updated
- frontend src/pages/member/Notifications.jsx | off | notification-deleted
- frontend src/pages/member/Notifications.jsx | off | notifications-cleared
- frontend src/components/chat/ChatWindow.jsx | emit | join-conversation
- frontend src/components/chat/ChatWindow.jsx | emit | seen-message
- frontend src/components/chat/ChatWindow.jsx | on | new-message
- frontend src/components/chat/ChatWindow.jsx | on | message-seen
- frontend src/components/chat/ChatWindow.jsx | on | message-deleted
- frontend src/components/chat/ChatWindow.jsx | on | typing
- frontend src/components/chat/ChatWindow.jsx | on | stop-typing
- frontend src/components/chat/ChatWindow.jsx | emit | leave-conversation
- frontend src/components/chat/ChatWindow.jsx | off | new-message
- frontend src/components/chat/ChatWindow.jsx | off | message-seen
- frontend src/components/chat/ChatWindow.jsx | off | message-deleted
- frontend src/components/chat/ChatWindow.jsx | off | typing
- frontend src/components/chat/ChatWindow.jsx | off | stop-typing
- frontend src/components/chat/CallOverlay.jsx | emit | call-mode-answer
- frontend src/components/chat/CallOverlay.jsx | on | call-started
- frontend src/components/chat/CallOverlay.jsx | on | call-answered
- frontend src/components/chat/CallOverlay.jsx | on | call-mode-offer
- frontend src/components/chat/CallOverlay.jsx | on | call-mode-answer
- frontend src/components/chat/CallOverlay.jsx | on | ice-candidate
- frontend src/components/chat/CallOverlay.jsx | on | call-ended
- frontend src/components/chat/CallOverlay.jsx | on | call-rejected
- frontend src/components/chat/CallOverlay.jsx | on | disconnect
- frontend src/components/chat/CallOverlay.jsx | off | call-started
- frontend src/components/chat/CallOverlay.jsx | off | call-answered
- frontend src/components/chat/CallOverlay.jsx | off | call-mode-offer
- frontend src/components/chat/CallOverlay.jsx | off | call-mode-answer
- frontend src/components/chat/CallOverlay.jsx | off | ice-candidate
- frontend src/components/chat/CallOverlay.jsx | off | call-ended
- frontend src/components/chat/CallOverlay.jsx | off | call-rejected
- frontend src/components/chat/CallOverlay.jsx | off | disconnect
- frontend src/components/chat/CallOverlay.jsx | emit | call-answer
- frontend src/components/chat/CallOverlay.jsx | emit | call-user
- frontend src/components/chat/CallOverlay.jsx | emit | call-mode-offer
- frontend src/components/member/NotificationCenter.jsx | emit | notification-register
- frontend src/components/member/NotificationCenter.jsx | on | connect
- frontend src/components/member/NotificationCenter.jsx | on | new-notification
- frontend src/components/member/NotificationCenter.jsx | on | notification-updated
- frontend src/components/member/NotificationCenter.jsx | on | notification-deleted
- frontend src/components/member/NotificationCenter.jsx | on | notifications-cleared
- frontend src/components/member/NotificationCenter.jsx | off | connect
- frontend src/components/member/NotificationCenter.jsx | off | new-notification
- frontend src/components/member/NotificationCenter.jsx | off | notification-updated
- frontend src/components/member/NotificationCenter.jsx | off | notification-deleted
- frontend src/components/member/NotificationCenter.jsx | off | notifications-cleared
- frontend src/components/dashboard/DashboardTopbar.jsx | on | new-message
- frontend src/components/dashboard/DashboardTopbar.jsx | on | message-seen
- frontend src/components/dashboard/DashboardTopbar.jsx | on | new-notification
- frontend src/components/dashboard/DashboardTopbar.jsx | off | new-notification
- frontend src/components/dashboard/DashboardTopbar.jsx | off | new-message
- frontend src/components/dashboard/DashboardTopbar.jsx | off | message-seen
- backend backend/sockets/notificationSocket.js | on | notification-register
- backend backend/sockets/notificationSocket.js | on | notification-read
- backend backend/sockets/notificationSocket.js | on | read-all-notifications
- backend backend/sockets/notificationSocket.js | emit | notification-count
- backend backend/sockets/notificationSocket.js | on | get-notification-count
- backend backend/sockets/notificationSocket.js | emit | notification-count
- backend backend/sockets/notificationSocket.js | on | delete-notification
- backend backend/sockets/socket.js | on | disconnect
- backend backend/sockets/messageSocket.js | on | user-online
- backend backend/sockets/messageSocket.js | on | presence-heartbeat
- backend backend/sockets/messageSocket.js | emit | presence-required
- backend backend/sockets/messageSocket.js | on | join-conversation
- backend backend/sockets/messageSocket.js | emit | chat-error
- backend backend/sockets/messageSocket.js | emit | conversation-joined
- backend backend/sockets/messageSocket.js | on | leave-conversation
- backend backend/sockets/messageSocket.js | on | call-user
- backend backend/sockets/messageSocket.js | emit | call-error
- backend backend/sockets/messageSocket.js | emit | call-error
- backend backend/sockets/messageSocket.js | on | call-answer
- backend backend/sockets/messageSocket.js | on | call-mode-offer
- backend backend/sockets/messageSocket.js | on | call-mode-answer
- backend backend/sockets/messageSocket.js | on | call-rejected
- backend backend/sockets/messageSocket.js | on | ice-candidate
- backend backend/sockets/messageSocket.js | on | end-call
- backend backend/sockets/messageSocket.js | on | typing
- backend backend/sockets/messageSocket.js | on | stop-typing
- backend backend/sockets/messageSocket.js | on | seen-message
- backend backend/sockets/messageSocket.js | on | disconnect
- backend backend/sockets/newsSocket.js | on | join-news
- backend backend/sockets/newsSocket.js | on | news-created
- backend backend/sockets/newsSocket.js | on | news-updated
- backend backend/sockets/newsSocket.js | on | news-deleted
- backend backend/sockets/newsSocket.js | on | news-liked
- backend backend/sockets/newsSocket.js | on | news-commented
- backend backend/sockets/newsSocket.js | on | news-viewed
- backend backend/sockets/pollSocket.js | on | join-polls
- backend backend/sockets/pollSocket.js | on | poll-created
- backend backend/sockets/pollSocket.js | on | poll-updated
- backend backend/sockets/pollSocket.js | on | poll-deleted
- backend backend/sockets/pollSocket.js | on | poll-voted
- backend backend/sockets/pollSocket.js | on | poll-closed
- backend backend/sockets/pollSocket.js | on | poll-opened
- backend backend/sockets/pollSocket.js | on | get-poll-results
- backend backend/sockets/pollSocket.js | emit | poll-results

## Page components
- src/pages/About.jsx
- src/pages/Constitution.jsx
- src/pages/Contact.jsx
- src/pages/Disclaimer.jsx
- src/pages/Feedback.jsx
- src/pages/Gallery.jsx
- src/pages/Home.jsx
- src/pages/Leaders.jsx
- src/pages/Login.jsx
- src/pages/News.jsx
- src/pages/NotFound.jsx
- src/pages/Polls.jsx
- src/pages/PortalSectionPage.jsx
- src/pages/PortalSettings.jsx
- src/pages/PrivacyPolicy.jsx
- src/pages/Services.jsx
- src/pages/TermsConditions.jsx
- src/pages/VerifyMembership.jsx
- src/pages/admin/AdminAccounts.jsx
- src/pages/admin/AdminAnnouncements.jsx
- src/pages/admin/AdminClaims.jsx
- src/pages/admin/AdminDashboard.jsx
- src/pages/admin/AdminFinance.jsx
- src/pages/admin/AdminMembers.jsx
- src/pages/admin/AdminMessages.jsx
- src/pages/admin/AdminNotifications.jsx
- src/pages/admin/AdminReports.jsx
- src/pages/admin/AdminSupport.jsx
- src/pages/admin/AdminWebsite.jsx
- src/pages/member/Accounts.jsx
- src/pages/member/Announcements.jsx
- src/pages/member/Benefits.jsx
- src/pages/member/Claims.jsx
- src/pages/member/Contributions.jsx
- src/pages/member/Dependents.jsx
- src/pages/member/MemberDashboard.jsx
- src/pages/member/Messages.jsx
- src/pages/member/MpesaRecords.jsx
- src/pages/member/Notifications.jsx
- src/pages/member/PortalGuide.jsx
- src/pages/member/Profile.jsx
- src/pages/member/Settings.jsx
- src/pages/member/Support.jsx
- src/pages/superadmin/SuperAdminAccounts.jsx
- src/pages/superadmin/SuperAdminAdmins.jsx
- src/pages/superadmin/SuperAdminAudit.jsx
- src/pages/superadmin/SuperAdminConstitution.jsx
- src/pages/superadmin/SuperAdminDashboard.jsx
- src/pages/superadmin/SuperAdminDataIntegrity.jsx
- src/pages/superadmin/SuperAdminNews.jsx
- src/pages/superadmin/SuperAdminNotifications.jsx
- src/pages/superadmin/SuperAdminPolicies.jsx
- src/pages/superadmin/SuperAdminSettings.jsx
- src/pages/superadmin/SuperAdminSystem.jsx

## Backend route files
- backend/routes/adminRoutes.js
- backend/routes/auditLogRoutes.js
- backend/routes/authRoutes.js
- backend/routes/carouselRoutes.js
- backend/routes/claimWorkflowRoutes.js
- backend/routes/contactRoutes.js
- backend/routes/contributionRoutes.js
- backend/routes/conversationRoutes.js
- backend/routes/dataIntegrityRoutes.js
- backend/routes/dependentRoutes.js
- backend/routes/educationSupportRoutes.js
- backend/routes/feedbackRoutes.js
- backend/routes/financeRoutes.js
- backend/routes/funeralSupportRoutes.js
- backend/routes/leaderRoutes.js
- backend/routes/medicalSupportRoutes.js
- backend/routes/memberRoutes.js
- backend/routes/messageRoutes.js
- backend/routes/newsRoutes.js
- backend/routes/notificationRoutes.js
- backend/routes/paymentRoutes.js
- backend/routes/platformRoutes.js
- backend/routes/policyRoutes.js
- backend/routes/pollRoutes.js
- backend/routes/superadminRoutes.js
- backend/routes/supportRequestRoutes.js
- backend/routes/voteRoutes.js
- backend/routes/websiteRoutes.js