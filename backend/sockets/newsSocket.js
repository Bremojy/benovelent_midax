const News = require("../models/News");

module.exports = (io, socket) => {

    /* ===========================================
       JOIN NEWS ROOM
    =========================================== */

    socket.on("join-news", () => {

        socket.join("news-room");

    });



    /* ===========================================
       NEW NEWS POST
    =========================================== */

    socket.on("news-created", async (newsId) => {

        try {

            const news = await News.findById(newsId)
                .populate("author", "fullName profileImage");

            if (!news) return;

            io.to("news-room").emit(
                "news-created",
                news
            );

            // Persistence and push delivery are owned by the news controller/model notification flow.



        }

        catch (err) {

            console.log(err);

        }

    });



    /* ===========================================
       NEWS UPDATED
    =========================================== */

    socket.on("news-updated", async (newsId) => {

        try {

            const news = await News.findById(newsId)
                .populate("author", "fullName profileImage");

            if (!news) return;

            io.to("news-room").emit(

                "news-updated",

                news

            );

        }

        catch (err) {

            console.log(err);

        }

    });



    /* ===========================================
       NEWS DELETED
    =========================================== */

    socket.on("news-deleted", (newsId) => {

        io.to("news-room").emit(

            "news-deleted",

            newsId

        );

    });



    /* ===========================================
       LIKE NEWS
    =========================================== */

    socket.on("news-liked", async (newsId) => {

        try {

            const news = await News.findById(newsId);

            if (!news) return;

            io.to("news-room").emit(

                "news-likes",

                {

                    newsId,

                    likes: news.likes.length

                }

            );

        }

        catch (err) {

            console.log(err);

        }

    });



    /* ===========================================
       COMMENT NEWS
    =========================================== */

    socket.on("news-commented", async (newsId) => {

        try {

            const news = await News.findById(newsId)
                .populate("comments.user", "fullName profileImage");

            if (!news) return;

            io.to("news-room").emit(

                "news-comments",

                {

                    newsId,

                    comments: news.comments

                }

            );

        }

        catch (err) {

            console.log(err);

        }

    });



    /* ===========================================
       NEWS VIEWED
    =========================================== */

    socket.on("news-viewed", async (newsId) => {

        try {

            const news = await News.findById(newsId);

            if (!news) return;

            news.views = (news.views || 0) + 1;

            await news.save();

            io.to("news-room").emit(

                "news-views",

                {

                    newsId,

                    views: news.views

                }

            );

        }

        catch (err) {

            console.log(err);

        }

    });

};