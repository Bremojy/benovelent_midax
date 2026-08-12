const News = require("../models/News");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const { notifyMembers } = require("../services/memberBroadcastService");

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
            poll
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

            published,

            publishDate,

            expiryDate,

            poll,

            author: req.user._id

        });

        if (published !== false) {

            const members = await Member.find({
                status: "active",
                isDeleted: false
            }).select("_id");

            if (members.length > 0) {

                const notifications = members.map(member => ({

                    recipient: member._id,

                    sender: req.user._id,

                    title: "New Announcement",

                    message: title,

                    type: "news",

                    referenceId: news._id,

                    referenceModel: "News",

                    icon: "campaign"

                }));

                await Notification.insertMany(notifications);

            }

            await notifyMembers({
                subject: `New announcement: ${title}`,
                text: summary || content,
                html: `<h2>${title}</h2><p>${(summary || content || "").replace(/\n/g, "<br>")}</p><p>Open the Benevolent Midax portal for the full update.</p>`,
                smsText: `${title} - Open the Benevolent Midax portal for the latest announcement.`,
                broadcastSms: true,
            });

        }

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

            message: error.message

        });

    }

};



/* =====================================================
   GET ALL NEWS
===================================================== */

exports.getAllNews = async (req, res) => {

    try {

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.status) {

            filter.status = req.query.status;

        }

        if (req.query.category) {

            filter.category = normalizeNewsCategory(req.query.category);

        }

        if (req.query.published !== undefined) {

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

        res.json({

            success: true,

            total,

            page,

            pages: Math.ceil(total / limit),

            count: news.length,

            news

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
   GET SINGLE NEWS
===================================================== */

exports.getNewsById = async (req, res) => {

    try {

        const news = await News.findById(req.params.id)

            .populate("author", "fullName email profileImage")

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

            message: error.message

        });

    }

};


/* =====================================================
   UPDATE NEWS
===================================================== */

exports.updateNews = async (req, res) => {

    try {

        const news = await News.findById(req.params.id);

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

        if (req.body.published !== undefined)
            news.published = req.body.published;

        if (req.body.publishDate !== undefined)
            news.publishDate = req.body.publishDate;

        if (req.body.expiryDate !== undefined)
            news.expiryDate = req.body.expiryDate;

        if (req.body.status !== undefined)
            news.status = req.body.status;

        if (req.body.poll !== undefined)
            news.poll = req.body.poll;

        await news.save();

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

            message: error.message

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

        res.json({

            success: true,

            message: "News deleted successfully."

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

        res.json({
            success: true,
            message: "News published successfully.",
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

        res.json({
            success: true,
            message: "News moved to drafts.",
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

        const news=await News.find({

            published:true,

            status:"published"

        })

        .populate("author","fullName profileImage")

        .sort({

            publishDate:-1

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
    return res.status(501).json({
        success: false,
        message: "Comment feature has not been implemented yet."
    });
};

exports.deleteComment = async (req, res) => {
    return res.status(501).json({
        success: false,
        message: "Comment feature has not been implemented yet."
    });
};

