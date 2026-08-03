const Poll = require("../models/Poll");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const News = require("../models/News");
const { notifyMembers } = require("../services/memberBroadcastService");

/* =====================================================
   CREATE POLL
===================================================== */

exports.createPoll = async (req, res) => {

    try {

        const {
            title,
            description,
            options,
            pollType,
            anonymous,
            showResults,
            active,
            startDate,
            endDate,
            news
        } = req.body;

        if (!title || !options || options.length < 2) {

            return res.status(400).json({
                success: false,
                message: "A poll requires a title and at least two options."
            });

        }

        if (!endDate) {

            return res.status(400).json({
                success: false,
                message: "Poll end date is required."
            });

        }

        const poll = await Poll.create({

            title,

            description,

            options,

            pollType,

            anonymous,

            showResults,

            active,

            startDate,

            endDate,

            news: news || null,

            createdBy: req.user._id

        });

        if (news) {

            await News.findByIdAndUpdate(
                news,
                {
                    poll: poll._id
                }
            );

        }

        const members = await Member.find({

            status: "active",

            isDeleted: false

        }).select("_id");

        if (members.length) {

            const notifications = members.map(member => ({

                recipient: member._id,

                sender: req.user._id,

                title: "New Poll",

                message: title,

                type: "poll",

                referenceId: poll._id,

                referenceModel: "Poll",

                icon: "poll"

            }));

            await Notification.insertMany(notifications);

        }

        await notifyMembers({
            subject: `New poll: ${title}`,
            text: description || title,
            html: `<h2>${title}</h2><p>${(description || "").replace(/\n/g, "<br>")}</p><p>Vote securely inside the portal.</p>`,
            smsText: `${title} - A new poll is live in Benevolent Midax.`,
            broadcastSms: true,
        });

        res.status(201).json({

            success: true,

            message: "Poll created successfully.",

            poll

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
   GET ALL POLLS
===================================================== */

exports.getAllPolls = async (req, res) => {

    try {

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const filter = {};

        // Members only see currently active polls.
        if (req.user?.role === "member") {
            filter.active = true;
            filter.endDate = { $gte: new Date() };
        } else if (req.query.active !== undefined) {

            filter.active = req.query.active === "true";

        }

        const total = await Poll.countDocuments(filter);

        const polls = await Poll.find(filter)

            .populate("createdBy", "fullName profileImage")

            .populate("news", "title")

            .sort({

                createdAt: -1

            })

            .skip(skip)

            .limit(limit)

            .lean();

        res.json({

            success: true,

            total,

            page,

            pages: Math.ceil(total / limit),

            count: polls.length,

            polls

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
   GET SINGLE POLL
===================================================== */

exports.getPollById = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.id)

            .populate("createdBy", "fullName email profileImage")

            .populate("news", "title")

            .lean();

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        res.json({
            success: true,
            poll
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



/* =====================================================
   UPDATE POLL
===================================================== */

exports.updatePoll = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.id);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        if (req.body.title !== undefined)
            poll.title = req.body.title;

        if (req.body.description !== undefined)
            poll.description = req.body.description;

        if (req.body.options !== undefined)
            poll.options = req.body.options;

        if (req.body.pollType !== undefined)
            poll.pollType = req.body.pollType;

        if (req.body.anonymous !== undefined)
            poll.anonymous = req.body.anonymous;

        if (req.body.showResults !== undefined)
            poll.showResults = req.body.showResults;

        if (req.body.active !== undefined)
            poll.active = req.body.active;

        if (req.body.startDate !== undefined)
            poll.startDate = req.body.startDate;

        if (req.body.endDate !== undefined)
            poll.endDate = req.body.endDate;

        if (req.body.news !== undefined)
            poll.news = req.body.news;

        await poll.save();

        await poll.populate("createdBy", "fullName profileImage");
        await poll.populate("news", "title");

        res.json({

            success: true,

            message: "Poll updated successfully.",

            poll

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



/* =====================================================
   DELETE POLL
===================================================== */

exports.deletePoll = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.id);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        if (poll.news) {

            await News.findByIdAndUpdate(

                poll.news,

                {
                    $unset: {
                        poll: ""
                    }
                }

            );

        }

        await poll.deleteOne();

        res.json({

            success: true,

            message: "Poll deleted successfully."

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/* =====================================================
   OPEN POLL
===================================================== */

exports.openPoll = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.id);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        poll.active = true;

        if (poll.endDate < new Date()) {

            poll.endDate = new Date(
                Date.now() + (7 * 24 * 60 * 60 * 1000)
            );

        }

        await poll.save();

        res.json({

            success: true,

            message: "Poll opened successfully.",

            poll

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
   CLOSE POLL
===================================================== */

exports.closePoll = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.id);

        if (!poll) {

            return res.status(404).json({

                success: false,

                message: "Poll not found."

            });

        }

        poll.active = false;

        poll.endDate = new Date();

        await poll.save();

        res.json({

            success: true,

            message: "Poll closed successfully.",

            poll

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
   GET ACTIVE POLLS
===================================================== */

exports.getActivePolls = async (req, res) => {

    try {

        const polls = await Poll.find({

            active: true,

            endDate: {
                $gte: new Date()
            }

        })

        .populate("createdBy", "fullName profileImage")

        .populate("news", "title")

        .sort({

            createdAt: -1

        })

        .lean();

        res.json({

            success: true,

            count: polls.length,

            polls

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
   GET CLOSED POLLS
===================================================== */

exports.getClosedPolls = async (req, res) => {

    try {

        const polls = await Poll.find({

            $or: [

                { active: false },

                {
                    endDate: {
                        $lt: new Date()
                    }
                }

            ]

        })

        .populate("createdBy", "fullName profileImage")

        .populate("news", "title")

        .sort({

            endDate: -1

        })

        .lean();

        res.json({

            success: true,

            count: polls.length,

            polls

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
   POLL STATISTICS
===================================================== */

exports.getPollStatistics = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.id);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        const statistics = poll.options.map(option => {

            const percentage = poll.totalVotes === 0
                ? 0
                : ((option.votes / poll.totalVotes) * 100).toFixed(2);

            return {

                optionId: option._id,

                option: option.text,

                votes: option.votes,

                percentage

            };

        });

        res.json({

            success: true,

            pollId: poll._id,

            title: poll.title,

            totalVotes: poll.totalVotes,

            statistics

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
   GET POPULAR POLLS
===================================================== */

exports.getPopularPolls = async (req, res) => {

    try {

        const polls = await Poll.find()

            .populate("createdBy", "fullName profileImage")

            .sort({

                totalVotes: -1,

                createdAt: -1

            })

            .limit(10)

            .lean();

        res.json({

            success: true,

            count: polls.length,

            polls

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
   AUTO CLOSE EXPIRED POLLS
===================================================== */

exports.closeExpiredPolls = async () => {

    try {

        await Poll.updateMany(

            {

                active: true,

                endDate: {

                    $lt: new Date()

                }

            },

            {

                $set: {

                    active: false

                }

            }

        );

        console.log("Expired polls closed.");

    }

    catch (error) {

        console.error("Auto Close Poll Error:", error);

    }

};



/* =====================================================
   POLL SUMMARY
===================================================== */

exports.getPollSummary = async (req, res) => {

    try {

        const [

            totalPolls,

            activePolls,

            closedPolls

        ] = await Promise.all([

            Poll.countDocuments(),

            Poll.countDocuments({

                active: true

            }),

            Poll.countDocuments({

                active: false

            })

        ]);

        res.json({

            success: true,

            summary: {

                totalPolls,

                activePolls,

                closedPolls

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

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */


// =====================================================
// PUBLIC ACTIVE POLLS
// =====================================================

exports.getPublicPolls = async (req, res) => {
    try {
        const polls = await Poll.find({
            active: true,
            endDate: { $gte: new Date() },
        })
            .populate("createdBy", "fullName profileImage")
            .populate("news", "title")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        return res.json({
            success: true,
            count: polls.length,
            polls,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getPolls = exports.getAllPolls;

exports.getPoll = exports.getPollById;

exports.reopenPoll = exports.openPoll;

exports.getPollResults = exports.getPollStatistics;