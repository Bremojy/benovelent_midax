const News = require("../models/News");
const redisCache = require("../services/redisCache");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const { notifyMembers } = require("../services/memberBroadcastService");

const invalidatePublicNewsCache = async () => {
    await redisCache.invalidatePrefix("public:news");
};

const notifyPublishedNews = async ({ news, actorId, actorModel = "Admin" }) => {
    const members = await Member.find({ status: "active", isDeleted: false }).select("_id");
    if (members.length > 0) {
        await Notification.insertMany(members.map((member) => ({
            recipient: member._id,
            sender: actorId,
            senderModel: actorModel,
            title: "New Announcement",
            message: news.title,
            type: "news",
            referenceId: news._id,
            referenceModel: "News",
            icon: "campaign",
        })));
    }
    await notifyMembers({
        subject: `New announcement: ${news.title}`,
        text: news.summary || news.content,
        html: `<h2>${news.title}</h2><p>${String(news.summary || news.content || "").replace(/\n/g, "<br>")}</p><p>Open the Benevolent Midax portal for the full update.</p>`,
        smsText: `${news.title} - Open the Benevolent Midax portal for the latest announcement.`,
        broadcastSms: true,
    });
};

const NEWS_CATEGORIES = new Map([
    ["general", "General"],
    ["announcement", "Announcement"],
    ["finance", "Finance"],
    ["contribution", "Contribution"],
    ["meeting", "Meeting"],
    ["event", "Event"],
    ["emergency", "Emergency"],
    ["election", "Election"],
    ["poll", "Poll"],
]);

const normalizeNewsCategory = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return "General";
    const normalized = NEWS_CATEGORIES.get(String(value).trim().toLowerCase());
    return normalized || String(value).trim();
};

/* =====================================================
   CREATE NEWS
===================================================== */

exports.createNews = async (req, res) => {

    try {
        const coverFile = req.files?.coverImage?.[0];
        const imageFiles = req.files?.images || [];
        const attachmentFiles = req.files?.attachments || [];
        const fileUrl = (file) => file?.path || file?.secure_url || file?.url || "";

        const {
            title,
            summary,
            content,
            category,
            coverImage,
            images,
            attachments,
            tags,
            featured,
            pinned,
            allowComments,
            published,
            publishDate,
            expiryDate,
            poll,
            sourceModel,
            sourceId,
            status
        } = req.body;

        if (!title || !content) {

            return res.status(400).json({
                success: false,
                message: "Title and content are required."
            });

        }

        const slug = title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const existing = await News.findOne({ slug });

        const parseArray = (value) => {
            if (Array.isArray(value)) return value;
            if (!value) return [];
            try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return String(value).split(",").map((item) => item.trim()).filter(Boolean); }
        };
        const parsedImages = parseArray(images);
        const parsedAttachments = parseArray(attachments);
        const parsedTags = parseArray(tags);

        if (existing) {

            return res.status(400).json({
                success: false,
                message: "News with similar title already exists."
            });

        }

        const isPublished = published === true || published === "true";
        const requestedStatus = String(status || "").trim().toLowerCase();
        const publicationStatus = isPublished ? "published" : (requestedStatus === "archived" ? "archived" : "draft");

        const news = await News.create({

            title,

            slug,

            summary,

            content,

            category: normalizeNewsCategory(category),

            coverImage: fileUrl(coverFile) || coverImage || "",

            images: imageFiles.length ? imageFiles.map(fileUrl) : (parsedImages),

            attachments: attachmentFiles.length ? attachmentFiles.map(file => ({ url: fileUrl(file), name: file.originalname || file.filename || "Attachment", type: file.mimetype || "" })) : (parsedAttachments),

            tags,

            featured,

            pinned,

            allowComments,

            published: isPublished,
            status: publicationStatus,

            publishDate: isPublished ? (publishDate || new Date()) : null,

            expiryDate,

            poll,

            sourceModel: sourceModel || "",
            sourceId: sourceId || "",

            author: req.user._id,
            authorModel: String(req.user?.role || "admin").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin"

        });

        if (news.published !== false && news.status === "published") {
            await notifyPublishedNews({ news, actorId: req.user._id, actorModel: String(req.user?.role || "admin").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin" });
        }
        await invalidatePublicNewsCache();

        res.status(201).json({

            success: true,

            message: "News created successfully.",

            news

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: process.env.NODE_ENV === "development" ? error.message : "Unable to complete the news operation."

        });

    }

};



/* =====================================================
   GET ALL NEWS
===================================================== */

exports.getAllNews = async (req, res) => {

    try {
        const role = String(req.user?.role || "").toLowerCase();
        const isPublicViewer = role === "member";
        const isPublicQuery = isPublicViewer || req.query.published === "true";
        const publicCacheKey = isPublicViewer ? `public:news:list:${JSON.stringify({ page: req.query.page, limit: req.query.limit, category: req.query.category })}` : (req.query.published === "true" ? `public:news:list:${JSON.stringify(req.query || {})}` : null);
        if (publicCacheKey) {
            const cached = await redisCache.getJson(publicCacheKey);
            if (cached !== null) {
                res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
                return res.json(cached);
            }
        }

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const filter = {};

        if (isPublicViewer) {
            filter.published = true;
            filter.status = "published";
            filter.publishDate = { $lte: new Date() };
            filter.$and = [{ $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: new Date() } }] }];
        }

        if (req.query.status && !isPublicViewer) {

            filter.status = req.query.status;

        }

        if (req.query.category) {

            filter.category = normalizeNewsCategory(req.query.category);

        }

        if (req.query.published !== undefined && !isPublicViewer) {
            filter.published = req.query.published === "true";
        }

        const total = await News.countDocuments(filter);

        const news = await News.find(filter)

            .populate("author", "fullName profileImage")

            .populate("poll")

            .sort({

                pinned: -1,

                featured: -1,

                publishDate: -1

            })

            .skip(skip)

            .limit(limit)

            .lean();

        const payload = { success: true, total, page, pages: Math.ceil(total / limit), count: news.length, news };
        if (publicCacheKey) {
            await redisCache.setJson(publicCacheKey, payload, 60);
            res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        }
        res.json(payload);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: process.env.NODE_ENV === "development" ? error.message : "Unable to complete the news operation."

        });

    }

};

/* =====================================================
   GET SINGLE NEWS
===================================================== */

exports.getNewsById = async (req, res) => {

    try {

        const role = String(req.user?.role || "").toLowerCase();
        const query = { _id: req.params.id };
        if (role === "member") {
            query.published = true;
            query.status = "published";
            query.publishDate = { $lte: new Date() };
            query.$or = [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: new Date() } }];
        }
        const news = await News.findOne(query)
            .populate("author", "fullName profileImage")
            .populate("poll")
            .lean();

        if (!news) {

            return res.status(404).json({

                success: false,

                message: "News not found."

            });

        }

        res.json({

            success: true,

            news

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: process.env.NODE_ENV === "development" ? error.message : "Unable to complete the news operation."

        });

    }

};


/* =====================================================
   UPDATE NEWS
===================================================== */

exports.updateNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);
        const wasPublished = Boolean(news?.published) && news?.status === "published";

        if (!news) {

            return res.status(404).json({

                success: false,

                message: "News not found."

            });

        }

        if (req.body.title) {

            news.title = req.body.title;

            news.slug = req.body.title

                .toLowerCase()

                .trim()

                .replace(/[^a-z0-9]+/g, "-")

                .replace(/^-|-$/g, "");

        }

        if (req.body.summary !== undefined)
            news.summary = req.body.summary;

        if (req.body.content !== undefined)
            news.content = req.body.content;

        if (req.body.category !== undefined)
            news.category = normalizeNewsCategory(req.body.category);

        if (req.body.coverImage !== undefined)
            news.coverImage = req.body.coverImage;

        if (req.body.images !== undefined)
            news.images = req.body.images;

        if (req.body.attachments !== undefined)
            news.attachments = req.body.attachments;

        if (req.body.tags !== undefined)
            news.tags = req.body.tags;

        if (req.body.featured !== undefined)
            news.featured = req.body.featured;

        if (req.body.pinned !== undefined)
            news.pinned = req.body.pinned;

        if (req.body.allowComments !== undefined)
            news.allowComments = req.body.allowComments;

        if (req.body.expiryDate !== undefined)
            news.expiryDate = req.body.expiryDate;

        if (req.body.poll !== undefined)
            news.poll = req.body.poll;

        await news.save();

        if (!wasPublished && news.published && news.status === "published") {
            await notifyPublishedNews({ news, actorId: req.user._id, actorModel: String(req.user?.role || "admin").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin" });
        }
        await invalidatePublicNewsCache();
        await news.populate("author", "fullName profileImage");

        res.json({

            success: true,

            message: "News updated successfully.",

            news

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: process.env.NODE_ENV === "development" ? error.message : "Unable to complete the news operation."

        });

    }

};


/* =====================================================
   DELETE NEWS
===================================================== */

exports.deleteNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {

            return res.status(404).json({

                success: false,

                message: "News not found."

            });

        }

        await news.deleteOne();
        await invalidatePublicNewsCache();

        res.json({

            success: true,

            message: "News deleted successfully."

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: process.env.NODE_ENV === "development" ? error.message : "Unable to complete the news operation."

        });

    }

};

/* =====================================================
   PUBLISH NEWS
===================================================== */

exports.publishNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {

            return res.status(404).json({
                success: false,
                message: "News not found."
            });

        }

        news.published = true;
        news.status = "published";
        news.publishDate = new Date();

        await news.save();
        await notifyPublishedNews({ news, actorId: req.user._id, actorModel: String(req.user?.role || "admin").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin" });
        await invalidatePublicNewsCache();

        await news.populate("author", "fullName profileImage");
        res.json({ success: true, message: "News published successfully.", news });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


/* =====================================================
   UNPUBLISH NEWS
===================================================== */

exports.unpublishNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {

            return res.status(404).json({
                success: false,
                message: "News not found."
            });

        }

        news.published = false;
        news.status = "draft";

        await news.save();
        await invalidatePublicNewsCache();

        await news.populate("author", "fullName profileImage");
        res.json({ success: true, message: "News moved to drafts.", news });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


/* =====================================================
   PIN NEWS
===================================================== */

exports.pinNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {

            return res.status(404).json({
                success: false,
                message: "News not found."
            });

        }

        news.pinned = true;

        await news.save();
        await invalidatePublicNewsCache();

        res.json({
            success: true,
            message: "News pinned successfully.",
            news
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
   UNPIN NEWS
===================================================== */

exports.unpinNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {

            return res.status(404).json({
                success: false,
                message: "News not found."
            });

        }

        news.pinned = false;

        await news.save();
        await invalidatePublicNewsCache();

        res.json({
            success: true,
            message: "News unpinned successfully.",
            news
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
   FEATURE NEWS
===================================================== */

exports.featureNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: "News not found."
            });
        }

        news.featured = true;

        await news.save();
        await invalidatePublicNewsCache();

        res.json({
            success: true,
            message: "News marked as featured.",
            news
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
   REMOVE FEATURED
===================================================== */

exports.unfeatureNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: "News not found."
            });
        }

        news.featured = false;

        await news.save();
        await invalidatePublicNewsCache();

        res.json({
            success: true,
            message: "News removed from featured.",
            news
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
   ARCHIVE NEWS
===================================================== */

exports.archiveNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: "News not found."
            });
        }

        news.status = "archived";
        news.published = false;

        await news.save();
        await invalidatePublicNewsCache();

        res.json({
            success: true,
            message: "News archived successfully.",
            news
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
   RESTORE NEWS
===================================================== */

exports.restoreNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: "News not found."
            });
        }

        news.status = "published";
        news.published = true;

        if (!news.publishDate) {
            news.publishDate = new Date();
        }

        await news.save();
        await invalidatePublicNewsCache();

        res.json({
            success: true,
            message: "News restored successfully.",
            news
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
   GET FEATURED NEWS
===================================================== */

exports.getFeaturedNews = async (req, res) => {

    try {

        const news = await News.find({
            featured: true,
            published: true,
            status: "published"
        })
        .populate("author", "fullName profileImage")
        .sort({ publishDate: -1 })
        .lean();

        res.json({
            success: true,
            count: news.length,
            news
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
   GET PINNED NEWS
===================================================== */

exports.getPinnedNews = async (req, res) => {

    try {

        const news = await News.find({
            pinned: true,
            published: true,
            status: "published"
        })
        .populate("author", "fullName profileImage")
        .sort({ publishDate: -1 })
        .lean();

        res.json({
            success: true,
            count: news.length,
            news
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
   SEARCH NEWS
===================================================== */

exports.searchNews = async (req, res) => {

    try {

        const keyword = req.query.keyword || "";

        const news = await News.find({

            $and: [

                {
                    status: "published"
                },

                {
                    published: true
                },

                {

                    $or: [

                        {
                            title: {
                                $regex: keyword,
                                $options: "i"
                            }
                        },

                        {
                            summary: {
                                $regex: keyword,
                                $options: "i"
                            }
                        },

                        {
                            content: {
                                $regex: keyword,
                                $options: "i"
                            }
                        },

                        {
                            tags: {
                                $regex: keyword,
                                $options: "i"
                            }
                        }

                    ]

                }

            ]

        })

        .populate("author","fullName profileImage")

        .sort({

            publishDate:-1

        })

        .lean();

        res.json({

            success:true,

            count:news.length,

            news

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
   GET NEWS BY CATEGORY
===================================================== */

exports.getNewsByCategory = async(req,res)=>{

    try{

        const news=await News.find({

            category:req.params.category,

            published:true,

            status:"published"

        })

        .populate("author","fullName profileImage")

        .sort({

            publishDate:-1

        })

        .lean();

        res.json({

            success:true,

            count:news.length,

            news

        });

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   LATEST NEWS
===================================================== */

exports.getLatestNews=async(req,res)=>{

    try{
        const cached = await redisCache.getJson("public:news:latest");
        if (cached) {
            res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
            return res.json(cached);
        }
        const news=await News.find({ published:true, status:"published" })
        .populate("author","fullName profileImage")
        .sort({ publishDate:-1 })
        .limit(10)
        .lean();
        const payload={ success:true, news };
        await redisCache.setJson("public:news:latest", payload, 120);
        res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        res.json(payload);

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   TRENDING NEWS
===================================================== */

exports.getTrendingNews=async(req,res)=>{

    try{

        const news=await News.find({

            published:true,

            status:"published"

        })

        .populate("author","fullName profileImage")

        .sort({

            views:-1,

            likes:-1

        })

        .limit(10)

        .lean();

        res.json({

            success:true,

            news

        });

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   INCREMENT NEWS VIEW
===================================================== */

exports.incrementViews=async(req,res)=>{

    try{

        const news=await News.findById(req.params.id);

        if(!news){

            return res.status(404).json({

                success:false,

                message:"News not found."

            });

        }

        news.views += 1;

        await news.save();

        res.json({

            success:true,

            views:news.views

        });

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   LIKE / UNLIKE NEWS
===================================================== */

exports.toggleLike=async(req,res)=>{

    try{

        const news=await News.findById(req.params.id);

        if(!news){

            return res.status(404).json({

                success:false,

                message:"News not found."

            });

        }

        const userId=req.user._id.toString();

        const liked=news.likes.find(

            id=>id.toString()===userId

        );

        if(liked){

            news.likes=news.likes.filter(

                id=>id.toString()!==userId

            );

        }

        else{

            news.likes.push(req.user._id);

        }

        await news.save();

        res.json({

            success:true,

            likes:news.likes.length,

            liked:!liked

        });

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};

// ======================================================
// COMPATIBILITY EXPORTS
// Keeps older routes working without changing the router
// ======================================================

// Main aliases
exports.getNews = exports.getAllNews;
exports.getSingleNews = exports.getNewsById;

// Likes
exports.likeNews = exports.toggleLike;
exports.unlikeNews = exports.toggleLike;

// Comments
exports.addComment = async (req, res) => {
    try {
        const text = String(req.body?.text || "").trim();
        if (!text) return res.status(400).json({ success: false, message: "Comment text is required." });
        if (text.length > 2000) return res.status(400).json({ success: false, message: "Comment is too long." });
        const news = await News.findOne({ _id: req.params.id, published: true, status: "published", allowComments: { $ne: false } });
        if (!news) return res.status(404).json({ success: false, message: "News item not found or comments are closed." });
        const role = String(req.userRole || req.user?.role || "member").toLowerCase();
        const authorModel = role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";
        const comment = { author: req.user._id, authorModel, authorName: String(req.user?.fullName || req.user?.name || "Member").trim(), profileImage: req.user?.profileImage || "", text, createdAt: new Date() };
        news.comments.push(comment);
        news.commentsCount = news.comments.length;
        await news.save();
        await redisCache.invalidatePrefix("public:news");
        return res.status(201).json({ success: true, message: "Comment added.", comment: news.comments[news.comments.length - 1], commentsCount: news.commentsCount });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteComment = async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) return res.status(404).json({ success: false, message: "News item not found." });
        const comment = news.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: "Comment not found." });
        const role = String(req.userRole || req.user?.role || "member").toLowerCase();
        if (String(comment.author) !== String(req.user._id) && !["admin", "superadmin"].includes(role)) return res.status(403).json({ success: false, message: "You can only remove your own comment." });
        comment.deleteOne();
        news.commentsCount = news.comments.length;
        await news.save();
        await redisCache.invalidatePrefix("public:news");
        return res.json({ success: true, message: "Comment deleted.", commentsCount: news.commentsCount });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

