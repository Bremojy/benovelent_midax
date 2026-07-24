const express = require("express");
const multer = require("multer");

const cloudinary = require("../config/cloudinary");
const Carousel = require("../models/Carousel");

const router = express.Router();


// ========================================
// MULTER CONFIGURATION
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),
});


// ========================================
// GET ALL CAROUSEL SLIDES
// ADMIN DASHBOARD
// ========================================

router.get("/", async (req, res) => {

  try {

    const slides = await Carousel.find()
      .sort({
        order: 1,
        createdAt: -1,
      });

    res.json(slides);

  } catch (error) {

    console.error(
      "Get carousel error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch carousel slides",
      error:
        error.message,
    });

  }

});


// ========================================
// GET ACTIVE CAROUSEL SLIDES
// PUBLIC WEBSITE
// ========================================

router.get("/active", async (req, res) => {

  try {

    const slides = await Carousel.find({
      isActive: true,
    }).sort({
      order: 1,
      createdAt: -1,
    });

    res.json(slides);

  } catch (error) {

    console.error(
      "Get active carousel error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch active slides",
      error:
        error.message,
    });

  }

});


// ========================================
// UPLOAD CAROUSEL IMAGE
// CLOUDINARY + MONGODB
// ========================================

router.post(
  "/upload",
  upload.single("image"),
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "CAROUSEL UPLOAD REQUEST RECEIVED"
      );

      console.log(
        "================================"
      );


      // CHECK IMAGE

      if (!req.file) {

        console.log(
          "ERROR: No image received"
        );

        return res.status(400).json({

          message:
            "Please select an image",

        });

      }


      console.log(
        "Image:",
        req.file.originalname
      );


      console.log(
        "Size:",
        req.file.size,
        "bytes"
      );


      // ========================================
      // UPLOAD TO CLOUDINARY
      // ========================================

      const uploadStream =
        cloudinary.uploader.upload_stream(

          {
            folder:
              "benevolent-midax/carousel",

            resource_type:
              "image",
          },

          async (
            error,
            result
          ) => {

            // CLOUDINARY ERROR

            if (error) {

              console.error(
                "CLOUDINARY ERROR:",
                error
              );

              return res.status(500).json({

                message:
                  "Cloudinary upload failed",

                error:
                  error.message,

              });

            }


            console.log(
              "Cloudinary upload successful"
            );


            console.log(
              "Image URL:",
              result.secure_url
            );


            // ========================================
            // SAVE TO MONGODB
            // ========================================

            try {

              const {

                title,

                description,

                buttonText,

                buttonLink,

                order,

              } = req.body;


              console.log(
                "Saving carousel to MongoDB..."
              );


              const slide =
                await Carousel.create({

                  imageUrl:
                    result.secure_url,

                  title:
                    title ||
                    "Benevolent Midax",

                  description:
                    description ||
                    "",

                  buttonText:
                    buttonText ||
                    "Discover More",

                  buttonLink:
                    buttonLink ||
                    "/about",

                  order:
                    Number(order) ||
                    0,

                  // IMPORTANT
                  // New uploads are active

                  isActive:
                    true,

                });


              console.log(
                "Carousel saved successfully"
              );


              console.log(
                "MongoDB ID:",
                slide._id
              );


              // ========================================
              // SEND RESPONSE
              // ========================================

              return res.status(201).json({

                message:
                  "Carousel image uploaded successfully",

                slide,

              });


            } catch (dbError) {

              console.error(
                "MONGODB SAVE ERROR:",
                dbError
              );


              return res.status(500).json({

                message:
                  "Image uploaded but failed to save to database",

                error:
                  dbError.message,

              });

            }

          }

        );


      // SEND IMAGE TO CLOUDINARY

      uploadStream.end(
        req.file.buffer
      );


    } catch (error) {

      console.error(
        "GENERAL UPLOAD ERROR:",
        error
      );


      return res.status(500).json({

        message:
          "Upload failed",

        error:
          error.message,

      });

    }

  }
);


// ========================================
// CREATE CAROUSEL SLIDE
// MANUAL IMAGE URL
// ========================================

router.post("/", async (req, res) => {

  try {

    const {

      imageUrl,

      title,

      description,

      buttonText,

      buttonLink,

      order,

    } = req.body;


    if (
      !imageUrl ||
      !title
    ) {

      return res.status(400).json({

        message:
          "Image URL and title are required",

      });

    }


    const slide =
      await Carousel.create({

        imageUrl,

        title,

        description,

        buttonText,

        buttonLink,

        order:
          Number(order) ||
          0,

        isActive:
          true,

      });


    res.status(201).json({

      message:
        "Carousel slide created successfully",

      slide,

    });


  } catch (error) {

    console.error(
      "Create carousel error:",
      error
    );


    res.status(500).json({

      message:
        "Failed to create carousel slide",

      error:
        error.message,

    });

  }

});


// ========================================
// UPDATE CAROUSEL SLIDE
// ========================================

router.put(
  "/:id",
  async (req, res) => {

    try {

      const slide =
        await Carousel.findByIdAndUpdate(

          req.params.id,

          req.body,

          {
            new: true,
            runValidators: true,
          }

        );


      if (!slide) {

        return res.status(404).json({

          message:
            "Carousel slide not found",

        });

      }


      res.json({

        message:
          "Carousel slide updated successfully",

        slide,

      });


    } catch (error) {

      console.error(
        "Update carousel error:",
        error
      );


      res.status(500).json({

        message:
          "Failed to update carousel slide",

        error:
          error.message,

      });

    }

  }
);


// ========================================
// DELETE CAROUSEL SLIDE
// ========================================

router.delete(
  "/:id",
  async (req, res) => {

    try {

      const slide =
        await Carousel.findByIdAndDelete(
          req.params.id
        );


      if (!slide) {

        return res.status(404).json({

          message:
            "Carousel slide not found",

        });

      }


      res.json({

        message:
          "Carousel slide deleted successfully",

      });


    } catch (error) {

      console.error(
        "Delete carousel error:",
        error
      );


      res.status(500).json({

        message:
          "Failed to delete carousel slide",

        error:
          error.message,

      });

    }

  }
);


module.exports = router;