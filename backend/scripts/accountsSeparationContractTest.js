#!/usr/bin/env node
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'); const must=(x,m)=>{if(!x)throw new Error(m)};
const app=read('src/App.jsx'), member=read('src/pages/member/Accounts.jsx'), admin=read('src/pages/admin/AdminAccounts.jsx'), superadmin=read('src/pages/superadmin/SuperAdminAccounts.jsx');
const financeRoutes=read('backend/routes/financeRoutes.js'), finance=read('backend/controllers/financeController.js'), payments=read('backend/routes/paymentRoutes.js'), paymentCtrl=read('backend/controllers/paymentController.js');
must(app.includes('path="/admin/accounts"')&&app.includes('<AdminAccounts />'),'Admin Accounts route missing.');
must(app.includes('path="/superadmin/accounts"')&&app.includes('<SuperAdminAccounts />'),'SuperAdmin Accounts route must be separate.');
must(member.includes('M-PESA Accounts')&&member.includes('Benovelent Constitution')&&member.includes('Community M-PESA Support'),'Member account tabs missing.');
must(member.includes('/payments/mine')&&member.includes('/finance/constitution-ledger')&&member.includes('MpesaTransactionButton'),'Member M-PESA/account ledger separation missing.');
must(admin.includes('contributorType')&&admin.includes('/finance')&&admin.includes('/finance/${tx._id}/attachment'),'Admin constitution transaction controls missing.');
must(admin.includes('Approve')&&admin.includes('Reject')&&admin.includes('Cancel'),'Admin M-PESA review controls missing.');
must(superadmin.includes('export default function SuperAdminAccounts')&&!superadmin.includes('import AdminAccounts'),'SuperAdmin Accounts must use independent composition.');
must(financeRoutes.includes('router.get("/constitution-ledger", protect, constitutionLedger);'),'Constitution ledger endpoint missing.');
must(financeRoutes.includes('router.post("/:id/attachment", protect, isAdminOrSuperAdmin'),'Finance attachment route missing.');
must(finance.includes('contributorType')&&finance.includes('exports.constitutionLedger'),'Constitution ledger backend model/controller support missing.');
must(payments.includes('router.delete("/community-assistance/:id", protect, isSuperAdmin'),'SuperAdmin permanent community request deletion route missing.');
must(paymentCtrl.includes('exports.deleteCommunity')&&paymentCtrl.includes('exports.myCommunityLedger'),'Community support ledger/delete handlers missing.');
must(paymentCtrl.includes('SuperAdmin accounts cannot make personal M-PESA contributions'),'SuperAdmin personal contribution guard missing.');
console.log('ACCOUNTS SEPARATION CONTRACT TEST PASSED');
