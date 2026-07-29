const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create folder automatically
const ensureDir = (folder) => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
};

const storage = (folderName) =>
    multer.diskStorage({
        destination(req, file, cb) {

            const folder = path.join(
                __dirname,
                "..",
                "uploads",
                folderName
            );

            ensureDir(folder);

            cb(null, folder);
        },

        filename(req, file, cb) {

            const ext = path.extname(file.originalname);

            cb(
                null,
                Date.now() +
                    "-" +
                    Math.round(Math.random() * 1e9) +
                    ext
            );
        },
    });

const imageFilter = (req, file, cb) => {

    if (file.mimetype.startsWith("image/")) {

        cb(null, true);

    } else {

        cb(new Error("Only image files allowed"), false);

    }

};

module.exports = {

    carouselUpload: multer({

        storage: storage("carousel"),

        fileFilter: imageFilter,

    }),

    leaderUpload: multer({

        storage: storage("leaders"),

        fileFilter: imageFilter,

    }),

    memberUpload: multer({

        storage: storage("members"),

        fileFilter: imageFilter,

    }),

    newsUpload: multer({

        storage: storage("news"),

        fileFilter: imageFilter,

    }),

    galleryUpload: multer({

        storage: storage("gallery"),

        fileFilter: imageFilter,

    }),

    profileUpload: multer({

        storage: storage("profiles"),

        fileFilter: imageFilter,

    }),

    receiptUpload: multer({

        storage: storage("receipts"),

    }),

    documentUpload: multer({

        storage: storage("documents"),

    })

};