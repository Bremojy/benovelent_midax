const express = require("express");

const cors = require("cors");

const mongoose = require("mongoose");

require("dotenv").config();


const authRoutes =
  require("./routes/authRoutes");

const leaderRoutes =
  require("./routes/leaderRoutes");


const carouselRoutes =
  require("./routes/carouselRoutes");

const memberRoutes =
  require("./routes/memberRoutes");

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json());


// ===============================
// ROUTES
// ===============================

app.get("/", (req, res) => {

  res.json({
    message:
      "Benevolent Midax API is running",
  });

});


app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/leaders",
  leaderRoutes
);

app.use(
  "/api/members",
  memberRoutes
);

app.use(
  "/api/carousel",
  carouselRoutes
);




// ===============================
// DATABASE
// ===============================

mongoose
  .connect(process.env.MONGO_URI)

  .then(() => {

    console.log(
      "MongoDB connected successfully"
    );


    app.listen(
      process.env.PORT || 5000,

      () => {

        console.log(
          `Server running on port ${
            process.env.PORT || 5000
          }`
        );

      }

    );

  })

  .catch((error) => {

    console.error(
      "MongoDB connection failed:",
      error
    );

  });