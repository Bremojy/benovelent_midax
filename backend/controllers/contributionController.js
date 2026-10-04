const Contribution = require("../models/Contribution");
const Finance = require("../models/Finance");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const { sanitizeDocument } = require("../utils/clientSanitizer");
const SystemSettings = require("../models/SystemSettings");
const { invalidateFinanceCache } = require("../services/financeLedgerService");
const createAuditLog = require("../utils/createAuditLog");
const { getFinanceActor } = require("../utils/financeActor");

async function safeContributionNotification(payload) {
  try { await Notification.create(payload); } catch (error) {
    console.warn("Contribution notification failed after persistence:", error.message);
  }
}

async function configuredMonthlyContribution() {
  const settings = await SystemSettings.findOne({ singletonKey: "primary" }).select("scheme.monthlyContribution").lean();
  return settings?.scheme?.monthlyContribution ?? null;
}

/* =====================================================
   CREATE CONTRIBUTION
===================================================== */

exports.createContribution = async (req, res) => {
  try {
    const {
      member,
      employeeNumber,
      month,
      year,
      expectedAmount,
      paidAmount = 0,
      paymentMethod,
      receiptNumber,
      mpesaCode,
      paymentDate,
      notes,
    } = req.body || {};

    if (paymentMethod !== undefined && String(paymentMethod).toLowerCase() !== "payroll") {
      return res.status(400).json({ success: false, code: "PAYROLL_ONLY_CONTRIBUTIONS", message: "Ordinary Benevolent MIDAX contributions are recorded from payroll only." });
    }

    if (!month || !year || expectedAmount == null) {
      return res.status(400).json({
        success: false,
        message: "Month, year and expected amount are required.",
      });
    }

    let memberId = member || null;
    if (!memberId && employeeNumber) {
      const found = await Member.findOne({ memberNumber: String(employeeNumber).trim() }).select("_id").lean();
      memberId = found?._id || null;
    }
    if (!memberId) {
      return res.status(400).json({ success: false, message: "Benevolent MIDAX Number is required." });
    }

    const memberExists = await Member.exists({ _id: memberId });
    if (!memberExists) {
      return res.status(404).json({ success: false, message: "Benevolent MIDAX Number not found." });
    }

    const exists = await Contribution.findOne({ member: memberId, month, year });
    if (exists) {
      return res.status(400).json({ success: false, message: "Contribution for this month already exists." });
    }

    const financeActor = getFinanceActor(req);

    const contribution = await Contribution.create({
      member: memberId,
      month,
      year,
      expectedAmount: Number(expectedAmount),
      paidAmount: Number(paidAmount || 0),
      source: "payroll",
      paymentMethod: "Payroll",
      receiptNumber,
      mpesaCode,
      paymentDate,
      notes,
    });

    if (Number(paidAmount || 0) > 0) {
      let createdFinanceId = null;
      try {
        const finance = await Finance.create({
          member: memberId,
          transactionNumber: `TRX-${Date.now()}-${String(contribution._id).slice(-6)}`,
          type: "contribution",
          category: "Monthly Contribution",
          amount: Number(paidAmount),
          paymentMethod: "Payroll",
          receiptNumber,
          referenceNumber: mpesaCode,
          description: `Contribution ${month}/${year}`,
          transactionDate: paymentDate || new Date(),
          status: "approved",
          approvedBy: req.user._id,
          approvedAt: new Date(),
          transactedBy: financeActor.id,
          transactedByModel: financeActor.model,
          transactedByName: financeActor.name,
        });
        createdFinanceId = finance._id;
        contribution.finance = finance._id;
        await contribution.save();
      } catch (syncError) {
        if (createdFinanceId) await Finance.findByIdAndDelete(createdFinanceId).catch(() => {});
        await contribution.deleteOne().catch(() => {});
        throw new Error(`Contribution/finance synchronization failed: ${syncError.message}`);
      }
    }

    await invalidateFinanceCache();

    await safeContributionNotification({
      recipient: memberId,
      recipientModel: "Member",
      sender: req.user._id,
      senderModel: String(req.user.role || "admin") === "superadmin" ? "SuperAdmin" : "Admin",
      title: "Contribution Recorded",
      message: `Your contribution for ${month}/${year} has been recorded.`,
      type: "contribution",
      referenceId: contribution._id,
      referenceModel: "Contribution",
    });

    return res.status(201).json({
      success: true,
      message: "Contribution created successfully.",
      contribution: sanitizeDocument(contribution),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


/* =====================================================
   BULK PAYROLL CONTRIBUTION RUN
   Records the same approved monthly deduction for all active members.
===================================================== */
exports.createBulkContributionRun = async (req, res) => {
  try {
    const month = Number(req.body?.month);
    const year = Number(req.body?.year) || new Date().getFullYear();
    const amount = Number(req.body?.amount);
    const paymentDate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();
    const recordAsCollected = req.body?.recordAsCollected !== false;
    const paymentMethod = "Payroll";
    const notes = String(req.body?.notes || "Monthly payroll deduction").trim();

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "A valid contribution month is required." });
    }
    const configuredAmount = await configuredMonthlyContribution();
    if (configuredAmount == null) {
      return res.status(503).json({ success: false, message: "The monthly contribution is not configured in SystemSettings." });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "A positive monthly contribution amount is required." });
    }
    if (Number(amount) !== Number(configuredAmount)) {
      return res.status(400).json({ success: false, code: "MONTHLY_CONTRIBUTION_MISMATCH", message: `The payroll amount must match the configured monthly contribution (${Number(configuredAmount).toLocaleString("en-KE")}).` });
    }
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: "A valid payment date is required." });
    }

    const members = await Member.find({ role: "member", status: "active", isDeleted: false })
      .select("_id fullName memberNumber")
      .lean();

    if (!members.length) {
      return res.status(400).json({ success: false, message: "No active members are available for the contribution run." });
    }

    let created = 0;
    let updated = 0;
    let collected = 0;
    const failures = [];
    const financeActor = getFinanceActor(req);

    for (const member of members) {
      let createdContribution = null;
      let createdFinance = null;
      let originalContribution = null;
      try {
        const paidAmount = recordAsCollected ? amount : 0;
        let contribution = await Contribution.findOne({ member: member._id, month, year });

        // A payroll run is idempotent, but it must never silently overwrite a
        // contribution that has already been deducted/paid. Re-running the
        // same month should leave the existing accounting event intact.
        if (contribution?.isArchived) {
          failures.push({ memberNumber: member.memberNumber, name: member.fullName, message: "The monthly contribution record is archived and cannot be reused for another payroll event." });
          continue;
        }
        if (contribution && Number(contribution.paidAmount || 0) > 0) {
          updated += 1;
          continue;
        }

        if (!contribution) {
          contribution = new Contribution({
            member: member._id,
            month,
            year,
            expectedAmount: amount,
            paidAmount,
            paymentMethod,
            paymentDate: recordAsCollected ? paymentDate : undefined,
            notes,
            approvedBy: req.user._id,
            approvedAt: new Date(),
          });
          await contribution.save();
          createdContribution = contribution;
          created += 1;
        } else {
          originalContribution = contribution.toObject();
          contribution.expectedAmount = amount;
          contribution.paymentMethod = paymentMethod;
          contribution.notes = notes;
          contribution.approvedBy = req.user._id;
          contribution.approvedAt = new Date();
          if (recordAsCollected) {
            contribution.paidAmount = amount;
            contribution.paymentDate = paymentDate;
          } else {
            contribution.paidAmount = Number(contribution.paidAmount || 0);
          }
          await contribution.save();
          updated += 1;
        }

        // Keep the financial ledger in sync with this specific contribution.
        // Do not search for and overwrite an unrelated transaction from the
        // same month when the link is missing.
        if (recordAsCollected) {
          let finance = contribution.finance
            ? await Finance.findById(contribution.finance)
            : null;

          if (!finance) {
            finance = await Finance.create({
              member: member._id,
              transactionNumber: `PAYROLL-${year}${String(month).padStart(2, "0")}-${member.memberNumber}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
              type: "contribution",
              category: "Monthly Payroll Contribution",
              amount,
              description: `Payroll contribution ${month}/${year}`,
              paymentMethod,
              transactionDate: paymentDate,
              status: "approved",
              approvedBy: req.user._id,
              approvedAt: new Date(),
              transactedBy: financeActor.id,
              transactedByModel: financeActor.model,
              transactedByName: financeActor.name,
              notes,
            });
            createdFinance = finance;
          }
          contribution.finance = finance._id;
          await contribution.save();
          collected += 1;
        }
      } catch (memberError) {
        if (createdFinance) await Finance.findByIdAndDelete(createdFinance._id).catch(() => {});
        if (createdContribution) {
          await Contribution.findByIdAndDelete(createdContribution._id).catch(() => {});
        } else if (originalContribution) {
          const existing = await Contribution.findById(originalContribution._id);
          if (existing) {
            Object.assign(existing, originalContribution);
            await existing.save().catch(() => {});
          }
        }
        failures.push({ memberNumber: member.memberNumber, name: member.fullName, message: memberError.message });
      }
    }

    // Keep the shared member profile field aligned as a display fallback only.
    await Member.updateMany({ role: "member", isDeleted: false }, { $set: { monthlyContribution: amount } });
    await invalidateFinanceCache();

    return res.status(201).json({
      success: true,
      message: `Payroll contribution run completed for ${members.length} active members.`,
      run: { month, year, amount, paymentMethod, recordAsCollected, totalMembers: members.length, created, updated, collected, failed: failures.length },
      failures,
    });
  } catch (error) {
    console.error("Bulk contribution run error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to complete bulk contribution run." });
  }
};

/* =====================================================
   GET ALL CONTRIBUTIONS
===================================================== */

exports.getContributions = async (req, res) => {
    try {
        const rawPage = Number(req.query?.page || 1);
        const rawLimit = Number(req.query?.limit || 20);
        const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
        const filter = { isArchived: { $ne: true } };
        const year = Number(req.query?.year);
        const month = Number(req.query?.month);
        const status = String(req.query?.status || "").trim();
        const search = String(req.query?.search || req.query?.employeeNumber || "").trim();
        if (Number.isInteger(year) && year > 0) filter.year = year;
        if (Number.isInteger(month) && month >= 1 && month <= 12) filter.month = month;
        if (status) filter.status = status;
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            const matchingMembers = await Member.find({ $or: [{ fullName: regex }, { memberNumber: regex }, { email: regex }] }).select("_id").limit(500).lean();
            filter.$or = matchingMembers.length ? [{ member: { $in: matchingMembers.map((x) => x._id) } }, { receiptNumber: regex }, { mpesaCode: regex }] : [{ receiptNumber: regex }, { mpesaCode: regex }];
        }
        const sort = { paymentDate: -1, year: -1, month: -1, createdAt: -1 };
        const [rows, total] = await Promise.all([
            Contribution.find(filter).populate("member", "fullName memberNumber profileImage").populate("approvedBy", "fullName").sort(sort).skip((page - 1) * limit).limit(limit).lean(),
            Contribution.countDocuments(filter),
        ]);
        const summaryRows = await Contribution.find(filter).select("expectedAmount paidAmount balance year").lean();
        const totalContributed = summaryRows.reduce((sum, item) => sum + Number(item.paidAmount || item.amount || 0), 0);
        const outstanding = summaryRows.reduce((sum, item) => sum + Math.max(0, Number(item.expectedAmount || 0) - Number(item.paidAmount || 0)), 0);
        const currentYear = new Date().getFullYear();
        const currentYearTotal = summaryRows.filter((item) => Number(item.year) === currentYear).reduce((sum, item) => sum + Number(item.paidAmount || item.amount || 0), 0);
        const configuredAmount = await configuredMonthlyContribution();
        return res.json({ success: true, count: total, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit, summary: {
            monthlyContribution: configuredAmount == null ? null : Number(configuredAmount),
            totalContributed, currentYear: currentYearTotal, outstanding,
        }, contributions: rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


/* =====================================================
   GET MEMBER CONTRIBUTIONS
===================================================== */

exports.getMemberContributions = async (req, res) => {
    try {
        const role = String(req.user?.role || "").toLowerCase();
        const memberId = role === "member" ? req.user._id : (req.params.memberId || req.user._id);
        if (role === "member" && req.params.memberId && String(req.params.memberId) !== String(req.user._id)) {
            return res.status(403).json({ success: false, code: "CONTRIBUTION_OWNERSHIP_FORBIDDEN", message: "You can only view your own contribution records." });
        }
        const rawPage = Number(req.query?.page || 1);
        const rawLimit = Number(req.query?.limit || 12);
        const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 40) : 12;
        const query = { member: memberId, isArchived: { $ne: true } };
        if (req.query.year !== undefined && Number(req.query.year)) query.year = Number(req.query.year);
        if (req.query.month !== undefined && Number(req.query.month) >= 1 && Number(req.query.month) <= 12) query.month = Number(req.query.month);
        if (req.query.status) query.status = String(req.query.status);
        if (req.query.search) {
            const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.$or = [{ receiptNumber: new RegExp(escaped, "i") }, { mpesaCode: new RegExp(escaped, "i") }];
        }
        const [rows, total] = await Promise.all([
            Contribution.find(query).populate("finance", "transactionNumber type category amount paymentMethod receiptNumber referenceNumber transactionDate status notes").sort({ paymentDate: -1, year: -1, month: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Contribution.countDocuments(query),
        ]);
        const summaryRows = await Contribution.find(query).select("expectedAmount paidAmount balance year").lean();
        return res.json({ success: true, scope: role === "member" ? "member" : "member-record", year: req.query.year ? Number(req.query.year) : null, count: total, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit, contributions: rows, summary: {
            totalExpected: summaryRows.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0),
            totalPaid: summaryRows.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
            totalBalance: summaryRows.reduce((sum, item) => sum + Math.max(0, Number(item.expectedAmount || 0) - Number(item.paidAmount || 0)), 0),
        } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


/* =====================================================
   UPDATE CONTRIBUTION
===================================================== */

exports.updateContribution = async (req, res) => {
    const financeActor = getFinanceActor(req);
    try {
        const contribution = await Contribution.findById(req.params.id);
        if (!contribution || contribution.isArchived) {
            return res.status(404).json({ success: false, message: "Contribution not found." });
        }

        const fields = ["expectedAmount", "paidAmount", "receiptNumber", "mpesaCode", "paymentDate", "notes"];
        if (req.body.paymentMethod !== undefined && String(req.body.paymentMethod).toLowerCase() !== "payroll") {
            return res.status(400).json({ success: false, code: "PAYROLL_ONLY_CONTRIBUTIONS", message: "Ordinary Benevolent MIDAX contributions are recorded from payroll only." });
        }

        const finance = contribution.finance ? await Finance.findById(contribution.finance) : null;
        const originalContribution = contribution.toObject();
        const originalFinance = finance ? finance.toObject() : null;

        contribution.source = "payroll";
        contribution.paymentMethod = "Payroll";
        fields.forEach((field) => {
            if (req.body[field] !== undefined) contribution[field] = req.body[field];
        });

        if (!Number.isFinite(Number(contribution.expectedAmount)) || Number(contribution.expectedAmount) < 0) {
            return res.status(400).json({ success: false, message: "Expected contribution amount must be a valid non-negative number." });
        }
        if (!Number.isFinite(Number(contribution.paidAmount)) || Number(contribution.paidAmount) < 0) {
            return res.status(400).json({ success: false, message: "Paid contribution amount must be a valid non-negative number." });
        }

        let createdFinance = null;
        try {
            await contribution.save();
            if (Number(contribution.paidAmount || 0) > 0) {
                if (finance) {
                    finance.member = contribution.member;
                    finance.type = "contribution";
                    finance.category = finance.category || "Monthly Contribution";
                    finance.amount = Number(contribution.paidAmount || 0);
                    finance.paymentMethod = "Payroll";
                    finance.receiptNumber = contribution.receiptNumber || "";
                    finance.referenceNumber = contribution.mpesaCode || "";
                    finance.transactionDate = contribution.paymentDate || finance.transactionDate;
                    finance.description = `Contribution ${contribution.month}/${contribution.year}`;
                    finance.notes = contribution.notes || "";
                    finance.hidden = false;
                    finance.hiddenAt = null;
                    finance.hiddenBy = null;
                    finance.status = "approved";
                    await finance.save();
                } else {
                    createdFinance = await Finance.create({
                        member: contribution.member,
                        transactionNumber: `TRX-${Date.now()}-${String(contribution._id).slice(-6)}`,
                        type: "contribution",
                        category: "Monthly Contribution",
                        amount: Number(contribution.paidAmount || 0),
                        paymentMethod: "Payroll",
                        receiptNumber: contribution.receiptNumber || "",
                        referenceNumber: contribution.mpesaCode || "",
                        description: `Contribution ${contribution.month}/${contribution.year}`,
                        transactionDate: contribution.paymentDate || new Date(),
                        status: "approved",
                        approvedBy: req.user._id,
                        approvedAt: new Date(),
                        transactedBy: financeActor.id,
                        transactedByModel: financeActor.model,
                        transactedByName: financeActor.name,
                        notes: contribution.notes || "",
                    });
                    contribution.finance = createdFinance._id;
                    await contribution.save();
                }
            } else if (finance) {
                // Preserve the accounting evidence but remove it from the normal
                // scheme balance when a previously-collected contribution is reset.
                finance.hidden = true;
                finance.hiddenAt = new Date();
                finance.hiddenBy = req.user._id;
                finance.status = "rejected";
                await finance.save();
            }
        } catch (syncError) {
            Object.assign(contribution, originalContribution);
            await contribution.save().catch(() => {});
            if (finance && originalFinance) {
                Object.assign(finance, originalFinance);
                await finance.save().catch(() => {});
            }
            if (createdFinance) await Finance.findByIdAndDelete(createdFinance._id).catch(() => {});
            throw new Error(`Contribution/finance synchronization failed: ${syncError.message}`);
        }

        await invalidateFinanceCache();
        await safeContributionNotification({
            recipient: contribution.member,
            recipientModel: "Member",
            sender: req.user._id,
            senderModel: String(req.user.role || "admin") === "superadmin" ? "SuperAdmin" : "Admin",
            title: "Contribution Updated",
            message: `Your contribution for ${contribution.month}/${contribution.year} has been updated.`,
            type: "contribution",
            referenceId: contribution._id,
            referenceModel: "Contribution"
        });

        return res.json({ success: true, message: "Contribution updated successfully.", contribution: sanitizeDocument(contribution) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


/* =====================================================
   DELETE CONTRIBUTION
===================================================== */

exports.deleteContribution = async (req, res) => {
    try {
        const contribution = await Contribution.findById(req.params.id);
        if (!contribution) return res.status(404).json({ success: false, message: "Contribution not found." });
        if (contribution.isArchived) return res.status(409).json({ success: false, code: "CONTRIBUTION_ALREADY_ARCHIVED", message: "This contribution is already archived." });

        const finance = contribution.finance ? await Finance.findById(contribution.finance) : null;
        const protectedRecord = Boolean(finance) || Number(contribution.paidAmount || 0) > 0 || contribution.status === "paid";

        if (!protectedRecord) {
            await contribution.deleteOne();
            await invalidateFinanceCache();
            return res.json({ success: true, action: "deleted", message: "Uncollected contribution deleted successfully." });
        }

        const originalContribution = contribution.toObject();
        const originalFinance = finance ? finance.toObject() : null;
        try {
            contribution.isArchived = true;
            contribution.archivedAt = new Date();
            contribution.archivedBy = req.user._id;
            contribution.archivedByModel = String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";
            contribution.archiveReason = String(req.body?.reason || "Removed from the operational ledger; accounting evidence retained.").slice(0, 500);
            await contribution.save();

            if (finance) {
                finance.hidden = true;
                finance.hiddenAt = new Date();
                finance.hiddenBy = req.user._id;
                await finance.save();
            }
        } catch (syncError) {
            Object.assign(contribution, originalContribution);
            await contribution.save().catch(() => {});
            if (finance && originalFinance) {
                Object.assign(finance, originalFinance);
                await finance.save().catch(() => {});
            }
            throw new Error(`Contribution/finance archive synchronization failed: ${syncError.message}`);
        }

        await createAuditLog({
            user: req.user._id,
            userRole: req.user.role,
            action: "CONTRIBUTION_ARCHIVED",
            module: "CONTRIBUTIONS",
            description: `Contribution ${contribution._id} was archived with its linked finance evidence retained.`,
            req,
            metadata: { contributionId: contribution._id, financeId: finance?._id || null, month: contribution.month, year: contribution.year, amount: contribution.paidAmount },
        });
        await invalidateFinanceCache();
        return res.json({ success: true, action: "archived", message: "Settled/linked contribution archived successfully and retained for auditability." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to remove the contribution safely." });
    }
};


/* =====================================================
   APPROVE CONTRIBUTION
===================================================== */

exports.approveContribution = async (req, res) => {

    try {

        const contribution = await Contribution.findById(req.params.id);

        if (!contribution) {

            return res.status(404).json({

                success: false,

                message: "Contribution not found."

            });

        }

        contribution.approvedBy = req.user._id;

        contribution.approvedAt = new Date();

        await contribution.save();
        await invalidateFinanceCache();

        await safeContributionNotification({
            recipient: contribution.member,

            sender: req.user._id,

            title: "Contribution Approved",

            message: `Your contribution for ${contribution.month}/${contribution.year} has been approved.`,

            type: "contribution",

            referenceId: contribution._id,

            referenceModel: "Contribution"

        });

        res.json({

            success: true,

            message: "Contribution approved successfully.",

            contribution: sanitizeDocument(contribution)

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   REJECT CONTRIBUTION
===================================================== */

exports.rejectContribution = async (req, res) => {

    try {

        const contribution = await Contribution.findById(req.params.id);

        if (!contribution) {

            return res.status(404).json({

                success: false,

                message: "Contribution not found."

            });

        }

        contribution.status = "pending";

        contribution.approvedBy = req.user._id;

        contribution.approvedAt = new Date();

        await contribution.save();
        await invalidateFinanceCache();

        await safeContributionNotification({
            recipient: contribution.member,

            sender: req.user._id,

            title: "Contribution Update",

            message: `Your contribution for ${contribution.month}/${contribution.year} requires review.`,

            type: "contribution",

            referenceId: contribution._id,

            referenceModel: "Contribution"

        });

        res.json({

            success: true,

            message: "Contribution sent back for review.",

            contribution: sanitizeDocument(contribution)

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   MEMBER CONTRIBUTION SUMMARY
===================================================== */

exports.getMemberContributionSummary = async (req, res) => {

    try {

        const contributions = await Contribution.find({

            member: req.params.memberId,
            isArchived: { $ne: true }

        });

        const summary = {

            totalExpected: 0,

            totalPaid: 0,

            totalBalance: 0,

            paidMonths: 0,

            pendingMonths: 0,

            overdueMonths: 0

        };

        contributions.forEach(item => {

            summary.totalExpected += item.expectedAmount;

            summary.totalPaid += item.paidAmount;

            summary.totalBalance += item.balance;

            if (item.status === "paid") summary.paidMonths++;

            if (item.status === "pending" || item.status === "partial")
                summary.pendingMonths++;

            if (item.status === "overdue")
                summary.overdueMonths++;

        });

        res.json({

            success: true,

            summary

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   CONTRIBUTION DASHBOARD
===================================================== */
exports.getContributionSummary = async (req, res) => {

    try {

        const contributions = await Contribution.find();

        const dashboard = {

            totalContributions: contributions.length,

            totalExpected: 0,

            totalCollected: 0,

            totalOutstanding: 0,

            paid: 0,

            partial: 0,

            pending: 0,

            overdue: 0

        };

        contributions.forEach(item => {

            dashboard.totalExpected += item.expectedAmount;
            dashboard.totalCollected += item.paidAmount;
            dashboard.totalOutstanding += item.balance;

            switch (item.status) {

                case "paid":
                    dashboard.paid++;
                    break;

                case "partial":
                    dashboard.partial++;
                    break;

                case "pending":
                    dashboard.pending++;
                    break;

                case "overdue":
                    dashboard.overdue++;
                    break;

            }

        });

        res.json({

            success: true,

            dashboard

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

// Get one contribution
exports.getContribution = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (String(req.user?.role || "").toLowerCase() === "member") query.member = req.user._id;
        const contribution = await Contribution.findOne(query)
            .select("member month year expectedAmount paidAmount balance paymentDate paymentMethod source receiptNumber status approvedBy approvedAt notes finance createdAt updatedAt")
            .populate("member", "_id fullName memberNumber profileImage department position")
            .populate("finance", "transactionNumber type category amount paymentMethod receiptNumber referenceNumber transactionDate status notes");

        if (!contribution) {
            return res.status(404).json({
                success: false,
                message: "Contribution not found."
            });
        }

        res.json({
            success: true,
            contribution: sanitizeDocument(contribution)
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

