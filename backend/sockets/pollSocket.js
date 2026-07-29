const Poll = require("../models/Poll");
const Vote = require("../models/Vote");

module.exports = (io, socket) => {

    /* ===========================================
       JOIN POLL ROOM
    =========================================== */

    socket.on("join-polls", () => {

        socket.join("poll-room");

    });





    /* ===========================================
       NEW POLL CREATED
    =========================================== */

    socket.on("poll-created", async (pollId) => {

        try {

            const poll = await Poll.findById(pollId)
                .populate("createdBy", "fullName profileImage");

            if (!poll) return;

            io.to("poll-room").emit(

                "poll-created",

                poll

            );

        }

        catch (err) {

            console.log(err);

        }

    });





    /* ===========================================
       POLL UPDATED
    =========================================== */

    socket.on("poll-updated", async (pollId) => {

        try {

            const poll = await Poll.findById(pollId);

            if (!poll) return;

            io.to("poll-room").emit(

                "poll-updated",

                poll

            );

        }

        catch (err) {

            console.log(err);

        }

    });





    /* ===========================================
       POLL DELETED
    =========================================== */

    socket.on("poll-deleted", (pollId) => {

        io.to("poll-room").emit(

            "poll-deleted",

            pollId

        );

    });





    /* ===========================================
       MEMBER VOTED
    =========================================== */

    socket.on("poll-voted", async ({ pollId }) => {

        try {

            const poll = await Poll.findById(pollId);

            if (!poll) return;

            const votes = await Vote.find({

                poll: pollId

            });

            const totalVotes = votes.length;

            const results = poll.options.map(option => {

                const count = votes.filter(

                    vote =>

                        vote.option === option.text

                ).length;

                return {

                    option: option.text,

                    votes: count,

                    percentage:

                        totalVotes === 0

                            ? 0

                            : Number(

                                  (

                                      count /

                                      totalVotes

                                  ) *

                                      100

                                  ).toFixed(1)

                };

            });

            io.to("poll-room").emit(

                "poll-results",

                {

                    pollId,

                    totalVotes,

                    results

                }

            );

        }

        catch (err) {

            console.log(err);

        }

    });





    /* ===========================================
       CLOSE POLL
    =========================================== */

    socket.on("poll-closed", async (pollId) => {

        try {

            const poll = await Poll.findById(pollId);

            if (!poll) return;

            poll.isClosed = true;

            await poll.save();

            io.to("poll-room").emit(

                "poll-closed",

                pollId

            );

        }

        catch (err) {

            console.log(err);

        }

    });





    /* ===========================================
       REOPEN POLL
    =========================================== */

    socket.on("poll-opened", async (pollId) => {

        try {

            const poll = await Poll.findById(pollId);

            if (!poll) return;

            poll.isClosed = false;

            await poll.save();

            io.to("poll-room").emit(

                "poll-opened",

                pollId

            );

        }

        catch (err) {

            console.log(err);

        }

    });





    /* ===========================================
       GET LIVE RESULTS
    =========================================== */

    socket.on("get-poll-results", async (pollId) => {

        try {

            const poll = await Poll.findById(pollId);

            if (!poll) return;

            const votes = await Vote.find({

                poll: pollId

            });

            const totalVotes = votes.length;

            const results = poll.options.map(option => {

                const count = votes.filter(

                    vote =>

                        vote.option === option.text

                ).length;

                return {

                    option: option.text,

                    votes: count,

                    percentage:

                        totalVotes === 0

                            ? 0

                            : Number(

                                  (

                                      count /

                                      totalVotes

                                  ) *

                                      100

                                  ).toFixed(1)

                };

            });

            socket.emit(

                "poll-results",

                {

                    pollId,

                    totalVotes,

                    results

                }

            );

        }

        catch (err) {

            console.log(err);

        }

    });

};