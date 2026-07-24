const express = require("express");
const multer = require("multer");

const cloudinary =
  require("../config/cloudinary");

const Leader =
  require("../models/Leader");

const router = express.Router();


// ========================================
// MULTER
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),
});


// ========================================
// GET ALL LEADERS
// ========================================

router.get("/", async (req, res) => {

  try {

    const leaders =
      await Leader.find()
        .sort({
          order: 1,
          createdAt: -1,
        });

    res.json(leaders);

  } catch (error) {

    console.error(
      "Get leaders error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch leaders",
      error:
        error.message,
    });

  }

});


// ========================================
// GET ACTIVE LEADERS
// PUBLIC WEBSITE
// ========================================

router.get(
  "/active",
  async (req, res) => {

    try {

      const leaders =
        await Leader.find({
          isActive: true,
        })
        .sort({
          order: 1,
        });

      res.json(leaders);

    } catch (error) {

      console.error(
        "Get active leaders error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch active leaders",
        error:
          error.message,
      });

    }

  }
);


// ========================================
// ADD LEADER
// IMAGE + CLOUDINARY
// ========================================

router.post(
  "/upload",
  upload.single("image"),
  async (req, res) => {

    try {

      const {

        name,

        position,

        bio,

        order,

      } = req.body;


      if (!name || !position) {

        return res.status(400).json({

          message:
            "Name and position are required",

        });

      }


      // ========================================
      // IF NO IMAGE
      // ========================================

      if (!req.file) {

        const leader =
          await Leader.create({

            name,

            position,

            bio:
              bio || "",

            order:
              Number(order) || 0,

            isActive:
              true,

          });


        return res.status(201).json({

          message:
            "Leader added successfully",

          leader,

        });

      }


      // ========================================
      // CLOUDINARY UPLOAD
      // ========================================

      const uploadStream =
        cloudinary.uploader.upload_stream(

          {
            folder:
              "benevolent-midax/leaders",

            resource_type:
              "image",
          },

          async (
            error,
            result
          ) => {

            if (error) {

              console.error(
                "Cloudinary leader error:",
                error
              );

              return res.status(500).json({

                message:
                  "Leader image upload failed",

                error:
                  error.message,

              });

            }


            try {

              const leader =
                await Leader.create({

                  name,

                  position,

                  bio:
                    bio || "",

                  imageUrl:
                    result.secure_url,

                  order:
                    Number(order) || 0,

                  isActive:
                    true,

                });


              res.status(201).json({

                message:
                  "Leader added successfully",

                leader,

              });

            } catch (dbError) {

              console.error(
                "Leader database error:",
                dbError
              );

              res.status(500).json({

                message:
                  "Image uploaded but leader could not be saved",

                error:
                  dbError.message,

              });

            }

          }

        );


      uploadStream.end(
        req.file.buffer
      );


    } catch (error) {

      console.error(
        "Add leader error:",
        error
      );

      res.status(500).json({

        message:
          "Failed to add leader",

        error:
          error.message,

      });

    }

  }
);


// ========================================
// UPDATE LEADER
// ========================================

router.put(
  "/:id",
  async (req, res) => {

    try {

      const leader =
        await Leader.findByIdAndUpdate(

          req.params.id,

          req.body,

          {
            new: true,

            runValidators: true,
          }

        );


      if (!leader) {

        return res.status(404).json({

          message:
            "Leader not found",

        });

      }


      res.json({

        message:
          "Leader updated successfully",

        leader,

      });

    } catch (error) {

      console.error(
        "Update leader error:",
        error
      );

      res.status(500).json({

        message:
          "Failed to update leader",

        error:
          error.message,

      });

    }

  }
);


// ========================================
// DELETE LEADER
// ========================================

router.delete(
  "/:id",
  async (req, res) => {

    try {

      const leader =
        await Leader.findByIdAndDelete(
          req.params.id
        );


      if (!leader) {

        return res.status(404).json({

          message:
            "Leader not found",

        });

      }


      res.json({

        message:
          "Leader deleted successfully",

      });

    } catch (error) {

      console.error(
        "Delete leader error:",
        error
      );

      res.status(500).json({

        message:
          "Failed to delete leader",

        error:
          error.message,

      });

    }

  }
);


module.exports =
  router;