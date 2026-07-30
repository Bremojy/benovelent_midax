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

        res.json({

            success: true,

            summary: {

                total,

                todayLogs,

                successful,

                failed

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