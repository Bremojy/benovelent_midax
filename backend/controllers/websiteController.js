const WebsiteContent = require("../models/WebsiteContent");

/* =====================================================
   GET ALL WEBSITE CONTENT
===================================================== */

exports.getWebsiteContent = async (req, res) => {

    try {

        const content = await WebsiteContent
            .find()
            .sort({ section: 1 })
            .lean();

        res.json({

            success: true,

            count: content.length,

            content

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
   GET SINGLE SECTION
===================================================== */

exports.getSection = async (req, res) => {

    try {

        const section = await WebsiteContent
            .findOne({

                section: req.params.section

            })
            .lean();

        if (!section) {

            return res.status(404).json({

                success: false,

                message: "Section not found."

            });

        }

        res.json({

            success: true,

            section

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/* =====================================================
   CREATE SECTION
===================================================== */

exports.createSection = async (req, res) => {

    try {

        const existing =
            await WebsiteContent.findOne({

                section: req.body.section

            });

        if (existing) {

            return res.status(400).json({

                success: false,

                message: "Section already exists."

            });

        }

        const section =
            await WebsiteContent.create({

                ...req.body,

                updatedBy: req.user._id

            });

        res.status(201).json({

            success: true,

            message: "Section created successfully.",

            section

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/* =====================================================
   UPDATE SECTION
===================================================== */

exports.updateSection = async (req, res) => {

    try {

        const section =
            await WebsiteContent.findOne({

                section: req.params.section

            });

        if (!section) {

            return res.status(404).json({

                success: false,

                message: "Section not found."

            });

        }

        section.title =
            req.body.title ?? section.title;

        section.subtitle =
            req.body.subtitle ?? section.subtitle;

        section.description =
            req.body.description ?? section.description;

        section.content =
            req.body.content ?? section.content;

        section.images =
            req.body.images ?? section.images;

        if (typeof req.body.published === "boolean") {

            section.published = req.body.published;

        }

        section.updatedBy = req.user._id;

        await section.save();

        res.json({

            success: true,

            message: "Website updated successfully.",

            section

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/* =====================================================
   DELETE SECTION
===================================================== */

exports.deleteSection = async (req, res) => {

    try {

        const section =
            await WebsiteContent.findOneAndDelete({

                section: req.params.section

            });

        if (!section) {

            return res.status(404).json({

                success: false,

                message: "Section not found."

            });

        }

        res.json({

            success: true,

            message: "Section deleted successfully."

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/* =====================================================
   INITIALIZE WEBSITE
===================================================== */

exports.initializeWebsite = async (req, res) => {

    try {

        const defaults = [

            "home",
            "about",
            "services",
            "contact",
            "footer",
            "settings"

        ];

        for (const section of defaults) {

            const exists =
                await WebsiteContent.findOne({

                    section

                });

            if (!exists) {

                await WebsiteContent.create({

                    section,

                    title: "",

                    subtitle: "",

                    description: "",

                    content: {},

                    images: [],

                    updatedBy: req.user._id

                });

            }

        }

        res.json({

            success: true,

            message: "Website initialized successfully."

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};