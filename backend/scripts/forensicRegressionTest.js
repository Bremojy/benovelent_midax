#!/usr/bin/env node
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../.."),read=r=>fs.readFileSync(path.join(root,r),"utf8");

// Vercel/build guard: every frontend relative import must resolve on the
// case-sensitive production filesystem (including CSS/static module imports).
const sourceFiles=[];
(function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){ if(!["node_modules","dist"].includes(entry.name)) walk(full); }
    else if(/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
})(path.join(root,"src"));
const missingImports=[];
const importPattern=/(?:from\s*|import\s*(?:\(\s*)?)["'](\.{1,2}\/[^"']+)["']/g;
for(const file of sourceFiles){
  const text=fs.readFileSync(file,"utf8"); let match;
  while((match=importPattern.exec(text))){
    const spec=match[1]; const base=path.resolve(path.dirname(file),spec);
    const candidates=path.extname(base) ? [base] : [base+".js",base+".jsx",base+".ts",base+".tsx",base+".css",base+".json",path.join(base,"index.js"),path.join(base,"index.jsx"),path.join(base,"index.ts"),path.join(base,"index.tsx")];
    if(!candidates.some(fs.existsSync)) missingImports.push(`${path.relative(root,file)} -> ${spec}`);
  }
}
assert.deepStrictEqual(missingImports,[] ,`Build blocker: unresolved local imports: ${missingImports.join("; ")}`);
const dashboard=read("src/pages/member/MemberDashboard.jsx"),model=read("backend/models/Notification.js"),nc=read("backend/controllers/notificationController.js"),ns=read("backend/sockets/notificationSocket.js"),ms=read("backend/sockets/messageSocket.js"),top=read("src/components/dashboard/DashboardTopbar.jsx"),payment=read("backend/controllers/paymentController.js"),finance=read("backend/controllers/financeController.js"),fr=read("backend/routes/financeRoutes.js"),sa=read("src/pages/superadmin/SuperAdminAccounts.jsx"),aa=read("src/pages/admin/AdminAccounts.jsx"),pr=read("backend/routes/paymentRoutes.js"),roles=read("backend/middleware/roleMiddleware.js");
assert(!dashboard.includes("/member/accounts?year="),"A: incompatible dashboard Accounts request remains"); assert(dashboard.includes("/member/contributions?year="),"A: member contribution contract missing");
assert(!model.includes('notificationSchema.post("save"'),"B: generic save fanout remains"); assert(!model.includes('notificationSchema.post("findOneAndUpdate"'),"B: generic update fanout remains"); assert(model.includes("fanoutCreatedNotification")&&model.includes("emitNotificationUpdated"),"B: lifecycle split missing"); assert(nc.includes("Notification.emitNotificationUpdated(notification)"),"B: HTTP read update lifecycle missing"); assert(ns.includes("Notification.emitNotificationUpdated(notification)"),"B: socket read update lifecycle missing");
assert(!top.includes('socket.on("new-call-notification", onNotification);'),"C: call-specific event increments general badge"); assert(ms.includes('emit("new-call-notification", callNotification)'),"C: call-specific UI event removed");
const mt=payment.slice(payment.indexOf("exports.myTransactions"),payment.indexOf("exports.getTransaction",payment.indexOf("exports.myTransactions"))); assert(mt.includes("const paymentMember = await resolvePaymentMember(req);"),"D: request-local payment member missing"); assert(!/\n\s*paymentMember\s*=/.test(mt),"D: undeclared/global payment member assignment remains"); assert(mt.includes("MpesaTransaction.find({ member: paymentMember._id })"),"D: transaction ownership filter missing");
const fg=finance.slice(finance.indexOf("exports.getTransaction"),finance.indexOf("/* =====================================================\n   UPDATE TRANSACTION",finance.indexOf("exports.getTransaction"))); assert(fg.includes('if (role === "member")'),"E: member authorization missing"); assert(fg.includes("member: req.user._id"),"E: member ownership query missing"); assert(fg.includes('return res.status(404).json({ success: false, message: "Transaction not found." })'),"E: non-leaking denial missing"); assert(fg.includes('fullName memberNumber email phone'),"F/G: privileged detail projection removed unexpectedly"); assert(fr.includes('router.get("/:id", protect, getTransaction);'),"E-G: finance single route missing"); assert(finance.includes("SETTLED_FINANCE_PROTECTED"),"Settled finance deletion protection missing");
assert(sa.includes("export default function SuperAdminAccounts"),"H: SuperAdmin page not independently composed"); assert(!sa.includes("import AdminAccounts"),"H: SuperAdmin still wraps AdminAccounts"); assert(!sa.includes("MpesaPaymentButton"),"H: SuperAdmin personal M-PESA button present"); assert(sa.includes("community-assistance/${c._id}/payout"),"H: community payout control missing"); assert(pr.includes('router.post("/community-assistance/:id/payout", protect, isSuperAdmin'),"H: payout backend authorization missing"); assert(pr.includes('router.delete("/transactions/:id", protect, isSuperAdmin'),"H: M-PESA delete backend authorization missing"); assert(!aa.includes('MpesaPaymentButton purpose="contribution"'),"I: Admin personal contribution UI still present"); assert(roles.includes('const isContributionUser = authorize("member", "admin", "superadmin");'),"I: contribution role middleware missing");
assert(ms.includes('if (String(recipient?.chatId || "") === String(caller?.chatId || ""))'),"J-L: self-call guard missing"); assert(ms.includes("isChatRole"),"J/K: canonical chat role helper missing"); assert(read("backend/utils/chatProfile.js").includes("const CHAT_ROLES = new Set(['member', 'admin'])"),"J/K: intended call roles missing"); assert(ms.includes("CALL_TIMEOUT_MS")&&ms.includes("markMissedCall"),"J/K: call timeout/missed lifecycle missing"); assert(ms.includes("suppressPush: true"),"C/J: call push duplication guard missing"); assert(payment.includes("idempotencyKey")&&payment.includes("reconcileSuccessfulTransaction"),"M: payment idempotency/reconciliation missing");
console.log("FORENSIC REGRESSION TEST PASSED");
