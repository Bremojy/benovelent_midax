from pathlib import Path
root=Path('/mnt/data/benovelent_work/v13')

def replace(path, old, new, count=-1):
    p=root/path
    s=p.read_text()
    if old not in s:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]}')
    p.write_text(s.replace(old,new,count))

# Member model: position is the only employment role field; member number immutable/BM format.
p=root/'backend/models/Member.js'
s=p.read_text()
s=s.replace('''    memberNumber: {\n      type: String,\n      required: true,\n      unique: true,\n      trim: true,\n    },''','''    memberNumber: {\n      type: String,\n      required: true,\n      unique: true,\n      trim: true,\n      immutable: true,\n      uppercase: true,\n      match: /^BM\\d{3,}$/i,\n    },''')
s=s.replace('''// =====================================\n// EMPLOYMENT\n// =====================================\n\noccupation: {\n  type: String,\n  trim: true,\n},\n\nemployer: {''','''// =====================================\n// EMPLOYMENT\n// =====================================\n\nposition: {\n  type: String,\n  trim: true,\n},\n\nemployer: {''')
# Remove duplicate top-level position definition if present, preserve the new canonical one below employment.
s=s.replace('''    position: {\n      type: String,\n      trim: true,\n    },\n\n    monthlyContribution:''','''    monthlyContribution:''')
p.write_text(s)

# Profile completion: position is part of completion, occupation no longer used.
p=root/'backend/utils/calculateProfileCompletion.js'
s=p.read_text()
s=s.replace('''  { key: "physicalAddress", label: "Physical address" },\n  { key: "siteStation", label: "Site station" },''','''  { key: "physicalAddress", label: "Physical address" },\n  { key: "position", label: "Position" },\n  { key: "siteStation", label: "Site station" },''')
p.write_text(s)

# Member controller: accept position; never update memberNumber/occupation from member profile.
p=root/'backend/controllers/memberController.js'
s=p.read_text()
s=s.replace('''            "customSiteStation",\n            "acceptedConstitution",''','''            "customSiteStation",\n            "position",\n            "acceptedConstitution",''')
s=s.replace('''            "accountNumber",\n            "occupation",\n            "employer",''','''            "accountNumber",\n            "employer",''')
p.write_text(s)

# Admin controller: canonicalize BM number; update cannot alter immutable member number.
p=root/'backend/controllers/adminController.js'
s=p.read_text()
old='''    const cleanMemberNumber =\n      String(memberNumber || "").trim();'''
new='''    const cleanMemberNumber =\n      String(memberNumber || "").trim().toUpperCase();\n\n    if (!/^BM\\d{3,}$/.test(cleanMemberNumber)) {\n      return res.status(400).json({\n        success: false,\n        code: "INVALID_BENOVELENT_MIDAX_NUMBER",\n        message: "Benovelent MIDAX Number must use the format BM001, BM002, BM003, etc."\n      });\n    }'''
s=s.replace(old,new)
# Add position to admin member dashboard selects/details if any occupation select is used.
s=s.replace('''member.nationalId = req.body.nationalId ?? member.nationalId;''','''member.position = req.body.position ?? member.position;\n    member.nationalId = req.body.nationalId ?? member.nationalId;''')
p.write_text(s)

# Admin Members UI: labels, read-only on edit, validation wording.
p=root/'src/pages/admin/AdminMembers.jsx'
s=p.read_text()
s=s.replace('''"Member Number, Full Name and Phone are required."''','''"Benovelent MIDAX Number, Full Name and Phone are required."''')
s=s.replace('''label="Member Number *"''','''label="Benovelent MIDAX Number *"''')
s=s.replace('''placeholder="e.g. BM001"\n            />''','''placeholder="e.g. BM001"\n              readOnly={editing}\n              title={editing ? "This Benovelent MIDAX Number is permanent and cannot be changed." : "Enter the existing Benovelent MIDAX Number, for example BM001."}\n            />''',1)
s=s.replace('''<MemberDetail label="Member / Employee Number" value={member.memberNumber} />''','''<MemberDetail label="Benovelent MIDAX Number" value={member.memberNumber} />''')
p.write_text(s)

# Admin Support: rename visible member fields and invite copy.
p=root/'src/pages/admin/AdminSupport.jsx'
s=p.read_text()
s=s.replace('''{member.occupation || "—"}''','''{member.position || "—"}''')
s=s.replace('''<strong>Occupation:</strong>''','''<strong>Position:</strong>''')
s=s.replace('''memberNumber: invite.memberNumber.trim(),''','''memberNumber: invite.memberNumber.trim().toUpperCase(),''')
s=s.replace('''memberNumber: "", fullName: "", username: "", phone: "", email: "", department: "", position: "",''','''memberNumber: "", fullName: "", username: "", phone: "", email: "", department: "", position: "",''')
p.write_text(s)

# Member profile UI uses position.
p=root/'src/pages/member/Profile.jsx'
s=p.read_text()
s=s.replace('''  occupation: "",\n  employer:''','''  position: "",\n  employer:''')
s=s.replace('''        occupation: member.occupation || "",''','''        position: member.position || "",''')
s=s.replace('''        occupation: member.occupation || "",''','''        position: member.position || "",''')
s=s.replace('''        occupation: member.occupation || "",''','''        position: member.position || "",''')
s=s.replace('''        occupation: member.occupation || "",\n        employer:''','''        position: member.position || "",\n        employer:''')
s=s.replace('''        occupation: member.occupation || "",''','''        position: member.position || "",''')
s=s.replace('''<Field label="Occupation" value={member.occupation} onChange={(v) => set("occupation", v)} />''','''<Field label="Position" value={member.position} onChange={(v) => set("position", v)} />''')
p.write_text(s)

# Finance UI text only; backend keeps employeeNumber as backward-compatible API field but resolves it to memberNumber.
p=root/'src/pages/admin/AdminFinance.jsx'
s=p.read_text().replace('Employee number','Benovelent MIDAX Number').replace('Enter employee number','Enter Benovelent MIDAX Number')
p.write_text(s)

# Admin service message text.
p=root/'src/services/adminService.js'
s=p.read_text().replace('Employee number is required.','Benovelent MIDAX Number is required.').replace('Employee number not found.','Benovelent MIDAX Number not found.')
p.write_text(s)

# Invitation includes email in all credential presentations.
p=root/'backend/controllers/adminController.js'
s=p.read_text()
s=s.replace('''      `Member Number: ${member.memberNumber}`,\n      `Username: ${member.username || member.email || member.phone}`,\n      `Temporary Password: ${temporaryPassword}`,''','''      `Benovelent MIDAX Number: ${member.memberNumber}`,\n      `Member Email: ${member.email}`,\n      `Username: ${member.username || member.email || member.phone}`,\n      `Temporary Password: ${temporaryPassword}`,''')
s=s.replace('''          <li><strong>Member Number:</strong> ${member.memberNumber}</li>\n          <li><strong>Username:</strong> ${member.username || member.email || member.phone}</li>''','''          <li><strong>Benovelent MIDAX Number:</strong> ${member.memberNumber}</li>\n          <li><strong>Member Email:</strong> ${member.email}</li>\n          <li><strong>Username:</strong> ${member.username || member.email || member.phone}</li>''')
s=s.replace('''? sendSmsNotification({ to: member.phone, message: `MIDAX login: ${member.username || member.email || member.phone}. Temp password: ${temporaryPassword}` })''','''? sendSmsNotification({ to: member.phone, message: `Benevolent MIDAX invite: ${member.fullName}. Number: ${member.memberNumber}. Email: ${member.email}. Username: ${member.username || member.email || member.phone}. Temp password: ${temporaryPassword}` })''')
p.write_text(s)

# Legacy migration: copy occupation to position only when position is blank.
mig=root/'backend/migrations/002_migrate_member_occupation_to_position.js'
mig.write_text('''const Member = require("../models/Member");\n\nmodule.exports = async function migrateMemberOccupationToPosition() {\n  const result = await Member.updateMany(\n    { occupation: { $exists: true, $nin: ["", null] }, $or: [{ position: { $exists: false } }, { position: "" }, { position: null }] },\n    [{ $set: { position: "$occupation" } }]\n  );\n  return result;\n};\n''')

# Add better assistant knowledge and human fallback by replacing the server knowledge block.
p=root/'backend/controllers/platformController.js'
s=p.read_text()
start=s.index('const ASSISTANT_KNOWLEDGE = [')
end=s.index('const tokenise =', start)
newblock=r'''const ASSISTANT_KNOWLEDGE = [
  ["identity", /\b(who are you|what can you do|help|assistant|benovelent|benevolent midax)\b/i, "I’m the Benevolent MIDAX Assistant. I’m here to give clear, human-friendly guidance about the website, membership, scheme benefits, portal features and where to find the right information. I won’t invent private records or official rules."],
  ["greeting", /\b(hello|hi|hey|good morning|good afternoon|good evening|how are you)\b/i, "Hello and welcome to Benevolent MIDAX. Tell me what you would like to know or what you are trying to do, and I’ll guide you step by step."],
  ["membership", /\b(join|membership|become a member|member registration|register as a member|who can join)\b/i, "Membership is managed through the scheme’s authorised process. When an administrator creates your account, you receive a Benovelent MIDAX Number (for example BM001) and login credentials. Your profile should then be completed fully and verified before restricted member services are unlocked."],
  ["member number", /\b(member number|membership number|benovelent midax number|benevolent midax number|bm\d{3,})\b/i, "Your Benovelent MIDAX Number is your permanent membership identifier, such as BM001. It is assigned to your member account and is not meant to be changed later."],
  ["profile completion", /\b(profile.*100|100% profile|complete my profile|profile completion|finish profile|missing profile details)\b/i, "Complete every required profile item, upload the requested documents, and accept the required declarations. When your profile reaches 100%, the system marks your account as waiting for verification and notifies the member, Admin and Super Admin. Restricted services become available after verification."],
  ["verification", /\b(verify|verification|verified|verification pending|pending verification|approve member|verify member)\b/i, "After a member reaches 100% profile completion, the account enters Verification Pending. An authorised Admin or Super Admin can open Member Administration and choose Verify Member. Once verified, the member can use restricted services such as Dependants and Support, subject to their account status."],
  ["position", /\b(position|job title|role at work|occupation|designation)\b/i, "The member profile uses Position to record the member’s work position. It is the same kind of information an Admin or Super Admin records when creating a member account; the old Occupation field is no longer the member profile field."],
  ["contribution", /\b(contribution|monthly contribution|pay contribution|how much.*contribution|500|five hundred)\b/i, "The website currently presents the monthly member contribution as Ksh 500. Your portal’s Accounts/Contributions area is the best place to see the records stored for your account, while the Constitution remains the authority for scheme rules."],
  ["funeral", /\b(funeral|death|burial|bereavement)\b/i, "Funeral support is one of the scheme benefits presented on the website. Claim eligibility, amounts, qualifying relatives and supporting documents are governed by the Constitution and the current claim process, so check the relevant Support/Claims page before submitting."],
  ["medical", /\b(medical|hospital|inpatient|treatment|sick)\b/i, "Medical support is available through the scheme process for eligible cases. Amounts and conditions depend on the Constitution, qualifying treatment and the member/family circumstances recorded by the scheme."],
  ["education", /\b(education|school fees|school support|college|university)\b/i, "Education support is presented as a planned/coming-soon area when it is not activated in the current website content. The assistant will not invent an amount; use the latest official scheme communication and Constitution when the benefit is active."],
  ["constitution", /\b(constitution|rules|governance|bylaws|policy|scheme rules)\b/i, "The Constitution is the authoritative source for governance, eligibility, benefit conditions and scheme procedures. Open Constitution to read, download or print the official document."],
  ["about", /\b(about|history|purpose|why benevolent midax|midax petroleum)\b/i, "The About section explains the relationship between Midax Petroleum Marketing and the Benevolent scheme, its purpose, member voice, accountability and communication."],
  ["services", /\b(services|benefits|what benefits|what support|scheme benefits)\b/i, "The public Services section explains the scheme’s support areas, including Funeral Support, Medical Support and the Education Support area when activated, together with Constitution-led procedures and accountability."],
  ["news", /\b(news|announcement|announcements|updates|latest update|newsroom)\b/i, "Open News to see published announcements, activities, resources and community updates. Some updates may also appear as notifications inside the portal."],
  ["events", /\b(event|events|calendar|activity|activities|meeting|meetings)\b/i, "Open the Events or News area to see published activities. Visibility depends on the audience configured by the scheme administrators."],
  ["resources", /\b(resource|resources|document|documents|form|forms|guide|guides|download)\b/i, "The Resource Centre contains published forms, guides and official documents. The Constitution and other public documents can be opened, downloaded or printed where available."],
  ["contact", /\b(contact|phone number|email address|whatsapp|office|location|where are you|nairobi)\b/i, "Open Contact for the official enquiry channels and location information. Do not send passwords, one-time codes or private documents through an unverified channel."],
  ["login", /\b(login|log in|sign in|access portal|portal access|username|password)\b/i, "Use Login to enter the secure portal with the credentials issued for your account. Keep your password private and change temporary credentials when prompted."],
  ["member portal", /\b(member portal|member dashboard|what can members do|member features)\b/i, "The member portal provides Profile, Dependants, Accounts/Contributions, Support, Claims, Messages, Notifications, News/Announcements, Polls and Settings according to account status and verification."],
  ["admin portal", /\b(admin portal|admin dashboard|administrator|admin features)\b/i, "The Admin portal provides authorised administration tools such as Member Administration, support/claims, accounts and finance, messages, notifications, news and operational controls."],
  ["superadmin portal", /\b(superadmin|super admin|super administrator|superadmin portal)\b/i, "The Super Admin portal provides higher-level administration, audit, data-integrity, member/admin management, messages, notifications, website/news settings and other restricted system controls."],
  ["dependants", /\b(dependant|dependants|dependent|dependents|spouse|children|child|parent|family members)\b/i, "Use Dependants to manage eligible family records used by support and claims. Dependants are available after the member account has completed verification and any other required status checks."],
  ["support", /\b(support request|support|assistance|apply for support|request assistance)\b/i, "Open Support, choose the appropriate support type, provide the required information and attach valid supporting documents. A verified member account is required for restricted support submission."],
  ["claims", /\b(claim|claims|claim status|track claim|claim tracking|request status)\b/i, "Open Claims or Support to submit or follow a request. The portal shows the status and timeline available for your account. Keep any claim/reference information shown by the system."],
  ["documents upload", /\b(upload|attachment|supporting documents|document upload|passport|national id|signature)\b/i, "For profile and claim forms, upload clear documents in the requested fields. Make sure the file matches the requested document type and is readable before submitting."],
  ["accounts", /\b(accounts|ledger|balance|contribution history|financial records|finance)\b/i, "Member Accounts/Contributions and authorised Finance pages show the records stored by the system. Where figures matter, treat the live portal and official scheme records as the source of truth."],
  ["chat", /\b(chat|message|messages|messaging|conversation|text someone)\b/i, "Open Messages to find authorised members or colleagues, start private conversations and exchange messages. Your own account is hidden from the chat directory so you cannot message yourself."],
  ["audio video calls", /\b(audio call|voice call|video call|video calling|call someone|calling|webcam)\b/i, "Messages supports browser audio and video calling. Both participants need a reliable internet connection, and the browser must allow microphone access for audio or microphone plus camera access for video. If a call cannot connect, check browser permissions and network restrictions first."],
  ["notifications", /\b(notification|notifications|push|bell|alert|alerts)\b/i, "Use Notifications and the bell icon for portal updates. Browser push alerts require permission. Verification requests, incoming calls and important system events can be surfaced through the notification system when supported."],
  ["calls permissions", /\b(camera permission|microphone permission|allow camera|allow microphone|camera not working|mic not working)\b/i, "For audio calls, allow microphone access. For video calls, allow both microphone and camera. If permission was previously denied, open the browser’s site permissions for Benevolent MIDAX, allow the devices and retry."],
  ["pwa", /\b(app|install|install app|android|iphone|home screen|pwa|phone)\b/i, "The website is installable as a Progressive Web App on supported browsers. Use the site’s Install prompt or your browser’s Install App/Add to Home Screen option."],
  ["polls", /\b(poll|polls|vote|voting|questionnaire)\b/i, "Open Polls to see active community questions and vote when your account is eligible. Published results may also appear in News."],
  ["feedback", /\b(feedback|survey|review|questionnaire|feedback collection)\b/i, "Use Feedback to complete any published collection. Some collections can be marked required by administrators, so finish all required questions before submitting."],
  ["privacy security", /\b(privacy|security|secure|personal data|private information|data protection)\b/i, "Open Privacy Policy for the public privacy guidance. Never share passwords, authentication codes or private member records with the assistant or another user. Access to portal data is role-restricted."],
  ["terms", /\b(terms|terms and conditions|conditions|acceptable use)\b/i, "Open Terms & Conditions for the rules that govern responsible use of the website and portals."],
  ["forgot password", /\b(forgot password|reset password|password reset|change password|temporary password)\b/i, "Use the password controls available in the portal. If an administrator created your account with a temporary password, change it as soon as the portal requests. Never disclose a password to the assistant."],
  ["logout", /\b(logout|log out|sign out)\b/i, "Use the account menu and choose Logout when you finish. For shared devices, always sign out and avoid saving passwords in a browser used by other people."],
  ["multiple devices", /\b(another phone|other phone|new device|same computer|same laptop|two accounts|multiple accounts|logged in elsewhere)\b/i, "For security, a successful login can replace an older server session for the same account. On a shared computer, use separate authorised accounts carefully and always sign out when finished."],
  ["browser", /\b(browser|chrome|edge|firefox|safari|supported browser)\b/i, "Use a current version of Chrome, Edge, Firefox or Safari. Camera, microphone, push notifications and PWA installation depend on what the browser and operating system support."],
  ["errors", /\b(error|errors|blank page|not working|broken|failed|failure|500|404)\b/i, "First refresh once after a new deployment and make sure the browser has the latest site version. Then follow the visible error message and retry once. For account-specific issues, use the official Contact/support channel rather than repeatedly submitting the same failed request."],
  ["admin add member", /\b(add member|create member|register member|invite member|new member)\b/i, "Authorised Admin/Super Admin users create members from Member Administration. The member record uses a permanent Benovelent MIDAX Number such as BM001, along with the member’s name, phone, email, department and position. The invitation includes the member email and login details."],
  ["invitation", /\b(invitation|invite|member invite|login credentials|credentials email)\b/i, "A member invitation contains the Benovelent MIDAX Number, member email, username/login identifier and temporary password. The member should change the temporary password immediately and never share it."],
  ["verification public", /\b(verify membership|membership verification|public verification)\b/i, "The public membership verification area can be used where enabled to check an official membership verification result. Do not use it to guess or expose private member information."],
  ["public pages", /\b(what pages|website sections|public website|website pages|where can i find)\b/i, "The public site includes Home, About, Services, News, Polls, Leaders, Gallery, Events, Resources, Constitution, Contact, Privacy Policy, Terms & Conditions, Disclaimer and membership verification where enabled."],
  ["human help", /\b(i do not understand|dont understand|do not know|explain again|simplify|what should i do|what do i do next|step by step)\b/i, "No problem. Tell me what you are trying to achieve in one sentence, for example “I want to add my children” or “my profile is 100% but I cannot submit support”. I’ll give you the simplest next steps without using technical language."],
]

'''
s=s[:start]+newblock+s[end:]
# Improve fallback answer to human phrasing and intent suggestions.
old='''  else if (!answer) answer = role === "public"\n    ? "I can help with the published Benevolent MIDAX website and current public updates. Try asking about the Constitution, services, contributions, funeral or medical support, news, events, resources, contact details, login or the public website."\n    : "I can help with the published Benevolent MIDAX website and your authorised portal navigation. Try asking about Profile, Dependants, Accounts, Support, Claims, Messages, Notifications, Calls, Polls, News, Resources or the Constitution.";'''
new='''  else if (!answer) {\n    const scope = role === "public"\n      ? "the public Benevolent MIDAX website"\n      : "your authorised Benevolent MIDAX portal";\n    answer = `I can help you with ${scope}, but I do not want to guess and give you the wrong rule. Tell me what you are trying to do in simple words—for example “my profile is 100%”, “how do I add a dependant?”, “what is BM001?”, “how do I submit support?”, “how do I make a video call?”, or “where is the Constitution?”—and I’ll guide you from there.`;\n  }'''
if old not in s: raise SystemExit('assistant fallback pattern not found')
s=s.replace(old,new)
p.write_text(s)

# Improve frontend assistant fallback and suggestions.
p=root/'src/components/SmartAssistant.jsx'
s=p.read_text()
s=s.replace('''  if (!text) return "Hello! Ask me about Benevolent MIDAX, the Constitution, services, contributions, support, claims, members, chat, calls, notifications, polls, resources or portal navigation.";''','''  if (!text) return "Hello! I’m here to help. Ask me what you want to know or do, and I’ll explain it in simple, human language.";''')
s=s.replace('''  if (text.includes("who are you") || text.includes("what can you do")) return "I’m Benevolent Assistant. I can explain published Benovelent MIDAX information, guide you around the portal and point you to the right section.";''','''  if (text.includes("who are you") || text.includes("what can you do")) return "I’m Benevolent Assistant. I can explain Benevolent MIDAX information, guide you around the website and portal, and help you understand what to do next without technical language.";''')
s=s.replace('''  if (role === "member") return "I could not match that to a published portal topic. Try Support, Claims, Profile, Accounts, Chat, Notifications, Polls or the Constitution.";\n  if (role === "admin" || role === "superadmin") return "I could not match that to a published admin topic. Try Members, Support, Claims, Chat, Notifications, Polls, News or the Constitution.";\n  return "I could not match that to a published website topic. Try Membership, Support, the Constitution, News or Contact information.";''','''  return "I do not want to guess and give you the wrong answer. Tell me what you are trying to do in simple words—such as completing your profile, getting verified, adding a dependant, submitting support, finding a member, making an audio/video call, or finding the Constitution—and I’ll guide you from there.";''')
p.write_text(s)

# Finance server messages remain API-compatible but use new nomenclature for users.
p=root/'backend/controllers/financeController.js'
s=p.read_text().replace('Employee number is required for this transaction type.','Benovelent MIDAX Number is required for this transaction type.').replace('Employee number not found.','Benovelent MIDAX Number not found.')
p.write_text(s)
p=root/'backend/controllers/contributionController.js'
s=p.read_text().replace('Employee number is required.','Benovelent MIDAX Number is required.').replace('Employee number not found.','Benovelent MIDAX Number not found.')
p.write_text(s)

# Admin create invite: SMS/email already include email; surface delivery and email in response safely.
