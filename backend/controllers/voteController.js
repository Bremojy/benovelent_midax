const Vote = require("../models/Vote");
const Poll = require("../models/Poll");

/* =====================================================
   CAST VOTE
===================================================== */

exports.castVote = async (req, res) => {

    try {

        const { pollId } = req.params;
        const { selectedOptions } = req.body;

        if (!selectedOptions || !selectedOptions.length) {

            return res.status(400).json({
                success: false,
                message: "Please select at least one option."
            });

        }

        const poll = await Poll.findById(pollId);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        if (!poll.active) {

            return res.status(400).json({
                success: false,
                message: "This poll has been closed."
            });

        }

        if (poll.endDate < new Date()) {

            poll.active = false;

            await poll.save();

            return res.status(400).json({
                success: false,
                message: "Poll has expired."
            });

        }

        // Single choice validation

        if (
            poll.pollType === "single" &&
            selectedOptions.length > 1
        ) {

            return res.status(400).json({
                success: false,
                message: "Only one option can be selected."
            });

        }

        // Duplicate vote check

        const alreadyVoted = await Vote.findOne({

            poll: pollId,

            member: req.user._id

        });

        if (alreadyVoted) {

            return res.status(400).json({

                success: false,

                message: "You have already voted."

            });

        }

        // Validate options

        for (const optionId of selectedOptions) {

            const exists = poll.options.find(

                option => option._id.toString() === optionId

            );

            if (!exists) {

                return res.status(400).json({

                    success: false,

                    message: "Invalid poll option selected."

                });

            }

        }

        // Save vote

        const vote = await Vote.create({

            poll: pollId,

            member: req.user._id,

            selectedOptions

        });

        // Update poll option counts

        selectedOptions.forEach(optionId => {

            const option = poll.options.find(

                o => o._id.toString() === optionId

            );

            if (option) {

                option.votes += 1;

            }

        });

        poll.totalVotes += 1;

        await poll.save();

        res.status(201).json({

            success: true,

            message: "Vote submitted successfully.",

            vote

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
   GET MY VOTE
===================================================== */

exports.getMyVote = async (req, res) => {

    try {

        const vote = await Vote.findOne({

            poll: req.params.pollId,

            member: req.user._id

        })

        .populate("poll", "title options")

        .lean();

        if (!vote) {

            return res.status(404).json({

                success: false,

                message: "You have not voted in this poll."

            });

        }

        res.json({

            success: true,

            vote

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
   REMOVE / CHANGE MY VOTE
===================================================== */

exports.removeVote = async (req, res) => {

    try {

        const vote = await Vote.findOne({
            poll: req.params.pollId,
            member: req.user._id
        });

        if (!vote) {

            return res.status(404).json({
                success: false,
                message: "Vote not found."
            });

        }

        const poll = await Poll.findById(vote.poll);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        vote.selectedOptions.forEach(optionId => {

            const option = poll.options.find(
                o => o._id.toString() === optionId.toString()
            );

            if (option && option.votes > 0) {

                option.votes--;

            }

        });

        if (poll.totalVotes > 0) {

            poll.totalVotes--;

        }

        await poll.save();

        await vote.deleteOne();

        res.json({

            success: true,

            message: "Vote removed successfully."

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
   GET POLL RESULTS
===================================================== */

exports.getPollResults = async (req, res) => {

    try {

        const poll = await Poll.findById(req.params.pollId);

        if (!poll) {

            return res.status(404).json({

                success: false,

                message: "Poll not found."

            });

        }

        const results = poll.options.map(option => ({

            id: option._id,

            option: option.text,

            votes: option.votes,

            percentage:
                poll.totalVotes === 0
                    ? 0
                    : Number(
                          (
                              (option.votes / poll.totalVotes) *
                              100
                          ).toFixed(2)
                      )

        }));

        res.json({

            success: true,

            poll: {

                id: poll._id,

                title: poll.title,

                totalVotes: poll.totalVotes,

                active: poll.active

            },

            results

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
   GET ALL VOTES (ADMIN)
===================================================== */

exports.getAllVotes = async (req, res) => {

    try {

        const votes = await Vote.find({

            poll: req.params.pollId

        })

        .populate("member","fullName memberNumber email profileImage")

        .sort({

            createdAt:-1

        })

        .lean();

        res.json({

            success:true,

            count:votes.length,

            votes

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   VOTE ANALYTICS
===================================================== */

exports.getVoteAnalytics = async (req,res)=>{

    try{

        const totalVotes=await Vote.countDocuments();

        const totalPolls=await Poll.countDocuments();

        const activePolls=await Poll.countDocuments({

            active:true

        });

        const averageVotes=

            totalPolls===0

                ?0

                :Number(

                    (totalVotes/totalPolls).toFixed(2)

                );

        res.json({

            success:true,

            analytics:{

                totalVotes,

                totalPolls,

                activePolls,

                averageVotesPerPoll:averageVotes

            }

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   LIVE RESULTS (SOCKET READY)
===================================================== */

exports.getLiveResults = async(req,res)=>{

    try{

        const poll=await Poll.findById(req.params.pollId).lean();

        if(!poll){

            return res.status(404).json({

                success:false,

                message:"Poll not found."

            });

        }

        const results=poll.options.map(option=>({

            optionId:option._id,

            option:option.text,

            votes:option.votes,

            percentage:

                poll.totalVotes===0

                ?0

                :Number(

                    (

                        (option.votes/poll.totalVotes)

                        *100

                    ).toFixed(2)

                )

        }));

        res.json({

            success:true,

            totalVotes:poll.totalVotes,

            results

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};
/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

// Routes already expecting these names
exports.getVotesByPoll = exports.getAllVotes;

exports.deleteVote = exports.removeVote;


/* =====================================================
   UPDATE VOTE
===================================================== */

exports.updateVote = async (req, res) => {

    try {

        const { selectedOptions } = req.body;

        if (!selectedOptions || !selectedOptions.length) {

            return res.status(400).json({
                success: false,
                message: "Please select at least one option."
            });

        }

        const vote = await Vote.findById(req.params.id);

        if (!vote) {

            return res.status(404).json({
                success: false,
                message: "Vote not found."
            });

        }

        // Only owner can update
        if (vote.member.toString() !== req.user._id.toString()) {

            return res.status(403).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const poll = await Poll.findById(vote.poll);

        if (!poll) {

            return res.status(404).json({
                success: false,
                message: "Poll not found."
            });

        }

        if (!poll.active) {

            return res.status(400).json({
                success: false,
                message: "Poll is closed."
            });

        }

        // Remove previous vote counts
        vote.selectedOptions.forEach(optionId => {

            const option = poll.options.find(
                o => o._id.toString() === optionId.toString()
            );

            if (option && option.votes > 0) {
                option.votes--;
            }

        });

        // Validate new options
        for (const optionId of selectedOptions) {

            const exists = poll.options.find(
                o => o._id.toString() === optionId
            );

            if (!exists) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid poll option selected."
                });

            }

        }

        // Add new vote counts
        selectedOptions.forEach(optionId => {

            const option = poll.options.find(
                o => o._id.toString() === optionId
            );

            if (option) {
                option.votes++;
            }

        });

        vote.selectedOptions = selectedOptions;

        await vote.save();
        await poll.save();

        res.json({

            success: true,
            message: "Vote updated successfully.",
            vote

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
