const AuditLog = require("../models/AuditLog");

// =====================================================
// GET AUDIT LOGS
// GET /api/audit-logs
// =====================================================

exports.getAuditLogs = async (req, res) => {

    try {

        const page =
            Number(req.query.page) || 1;

        const limit =
            Number(req.query.limit) || 20;

        const skip =
            (page - 1) * limit;

        const filter = {};

        if (req.query.userRole)
            filter.userRole = req.query.userRole;

        if (req.query.action)
            filter.action = req.query.action;

        if (req.query.module)
            filter.module = req.query.module;

        if (req.query.status)
            filter.status = req.query.status;

        if (req.query.user)
            filter.user = req.query.user;

        if (
            req.query.startDate &&
            req.query.endDate
        ) {

            filter.createdAt = {

                $gte: new Date(req.query.startDate),

                $lte: new Date(req.query.endDate)

            };

        }

        const total =
            await AuditLog.countDocuments(filter);

        const logs =
            await AuditLog.find(filter)

            .populate(
                "user",
                "fullName memberNumber username email"
            )

            .sort({
                createdAt: -1
            })

            .skip(skip)

            .limit(limit);

        res.json({

            success: true,

            pagination: {

                total,

                page,

                pages: Math.ceil(total / limit),

                limit

            },

            logs

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

// =====================================================
// GET SINGLE LOG
// =====================================================

exports.getAuditLog = async (req, res) => {

    try {

        const log =
            await AuditLog.findById(req.params.id)

            .populate(
                "user",
                "fullName memberNumber username email"
            );

        if (!log) {

            return res.status(404).json({

                success: false,

                message: "Audit log not found."

            });

        }

        res.json({

            success: true,

            log

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

// =====================================================
// DELETE LOG
// SUPER ADMIN
// =====================================================

exports.deleteAuditLog = async (req, res) => {

    try {

        const log =
            await AuditLog.findById(req.params.id);

        if (!log) {

            return res.status(404).json({

                success: false,

                message: "Audit log not found."

            });

        }

        await log.deleteOne();

        res.json({

            success: true,

            message: "Audit log deleted."

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

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

exports.getAuditSummary = async (req, res) => {

    try {

        const total =
            await AuditLog.countDocuments();

        const today =
            new Date();

        today.setHours(0,0,0,0);

        const todayLogs =
            await AuditLog.countDocuments({

                createdAt: {

                    $gte: today

                }

            });

        const failed =
            await AuditLog.countDocuments({

                status: "FAILED"

            });

        const successful =
            await AuditLog.countDocuments({

                status: "SUCCESS"

            });

        const [creates, updates, deletes] = await Promise.all([
            AuditLog.countDocuments({ action: { $in: ["CREATE", "CREATED", "REGISTER", "REGISTERED", "ADD", "ADDED"] } }),
            AuditLog.countDocuments({ action: { $in: ["UPDATE", "UPDATED", "EDIT", "EDITED", "MODIFY", "MODIFIED"] } }),
            AuditLog.countDocuments({ action: { $in: ["DELETE", "DELETED", "REMOVE", "REMOVED"] } })
        ]);

        res.json({

            success: true,

            summary: {

                total,

                todayLogs,
                today: todayLogs,
                successful,
                failed,
                creates,
                updates,
                deletes

            }

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
// =====================================================
// AUDIT COVERAGE
// Shows every registered account that can appear in governance
// plus the three named leadership roles from the constitution.
// The constitution does not name individual members, so members
// are sourced from the live Member collection.
// GET /api/audit-logs/coverage
// =====================================================
exports.getAuditCoverage = async (req, res) => {
    try {
        const Member = require("../models/Member");
        const Admin = require("../models/Admin");
        const SuperAdmin = require("../models/SuperAdmin");

        const constitutionLeadership = [
            { position: "Chairperson", name: "Moses Machila" },
            { position: "Treasurer", name: "Immaculate" },
            { position: "Secretary", name: "Isabela" },
        ];

        const [members, admins, superadmins] = await Promise.all([
            Member.find({ isDeleted: { $ne: true } })
                .select("fullName memberNumber email status role profileImage")
                .sort({ fullName: 1 })
                .lean(),
            Admin.find({ status: { $ne: "deleted" } })
                .select("fullName email status role profileImage")
                .sort({ fullName: 1 })
                .lean(),
            SuperAdmin.find({ status: { $ne: "deleted" } })
                .select("fullName email status role profileImage")
                .sort({ fullName: 1 })
                .lean(),
        ]);

        const accountSets = [
            ["member", members, "Member"],
            ["admin", admins, "Admin"],
            ["superadmin", superadmins, "SuperAdmin"],
        ];

        const auditIds = accountSets.flatMap(([, accounts, userModel]) =>
            accounts.map((account) => ({ id: account._id, userModel }))
        );

        const auditAggregates = auditIds.length
            ? await AuditLog.aggregate([
                {
                    $match: {
                        $or: auditIds.map(({ id, userModel }) => ({ user: id, userModel })),
                    },
                },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: { user: "$user", userModel: "$userModel" },
                        total: { $sum: 1 },
                        successful: { $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
                        last: {
                            $first: {
                                createdAt: "$createdAt",
                                action: "$action",
                                module: "$module",
                                description: "$description",
                                status: "$status",
                            },
                        },
                    },
                },
            ])
            : [];

        const auditMap = new Map(
            auditAggregates.map((item) => [
                `${item._id.userModel}:${String(item._id.user)}`,
                item,
            ])
        );

        const coverage = [];
        for (const [role, accounts, userModel] of accountSets) {
            for (const account of accounts) {
                const audit = auditMap.get(`${userModel}:${String(account._id)}`) || {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    last: null,
                };
                coverage.push({
                    id: String(account._id),
                    name: account.fullName || account.name || account.email || "Unnamed account",
                    email: account.email || "",
                    role,
                    status: account.status || "active",
                    memberNumber: account.memberNumber || "",
                    profileImage: account.profileImage || "",
                    audit: { total: audit.total || 0, successful: audit.successful || 0, failed: audit.failed || 0, last: audit.last || null },
                });
            }
        }

        const normalized = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const leadership = constitutionLeadership.map((entry) => {
            const wanted = normalized(entry.name);
            const matched = admins.find((admin) => {
                const haystack = [admin.fullName, admin.email].map(normalized).join(" ");
                const first = normalized(String(admin.fullName || "").split(" ")[0]);
                return wanted && (haystack.includes(wanted) || (wanted.length >= 5 && first.startsWith(wanted)));
            });
            const matchedCoverage = matched && coverage.find((item) => item.id === String(matched._id));
            return {
                ...entry,
                matchedAccountId: matchedCoverage?.id || null,
                matchedAccountName: matchedCoverage?.name || null,
                auditCount: matchedCoverage?.audit.total || 0,
            };
        });

        res.json({
            success: true,
            constitution: {
                leadership,
                memberNamesInDocument: 0,
                memberNote: "The constitution describes members collectively and does not list individual member names.",
            },
            counts: {
                members: members.length,
                admins: admins.length,
                superadmins: superadmins.length,
                accounts: coverage.length,
            },
            coverage,
        });
    } catch (error) {
        console.error("Audit coverage error:", error);
        res.status(500).json({ success: false, message: error.message || "Unable to load audit coverage." });
    }
};
