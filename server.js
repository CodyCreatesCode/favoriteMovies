const express = require("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const axios = require("axios");
const bodyParser = require('body-parser');
const path = require("path"); // Import the 'path' module

const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "secret",

    resave: false,

    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Middleware to parse request body as JSON
app.use(bodyParser.json());

// Set the 'public' folder as the location for serving static files
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/users/register", checkAuthenticatied, (req, res) => {
  res.render("register");
});

app.get("/users/login", checkAuthenticatied, (req, res) => {
  res.render("login");
});

app.get("/users/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/users/login");
  });
});

app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;
  console.log({
    name,
    email,
    password,
    password2,
  });

  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password should be at least 6 characters" });
  }

  if (password != password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors });
  } else {
    // Form validation has passed

    let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    pool.query(
      `SELECT * FROM users
            WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({ message: "Email already registered" });
          res.render("register", { errors });
        } else {
          pool.query(
            `INSERT INTO users (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function checkAuthenticatied(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/users/login");
}

app.get("/search", async (req, res) => {
  const searchQuery = req.query.q;
  const response = await axios.get("https://www.omdbapi.com/", {
    params: {
      apikey: "6f140aea", // make sure to replace this with your actual API key
      s: searchQuery,
    },
  });
  res.json(response.data.Search);
});




// Add this route to handle favorite movie data
app.post('/favorites', (req, res) => {
  const movieId = req.body.movieId;

  const userId = req.user.id; 

  pool.query(
    `INSERT INTO user_favorites (user_id, movie_id) VALUES ($1, $2)`,
    [userId, movieId],
    (err, results) => {
      if (err) {
        console.error('Error saving favorite movie:', err);
        res.status(500).json({ error: 'Failed to save favorite movie' });
      } else {
        res.sendStatus(200);
      }
    }
  );
});


app.get("/users/dashboard", checkNotAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have the logged-in user's ID available
    // Fetch the favorited movies for the logged-in user from the database
    const favoriteMovies = await pool.query(
      "SELECT * FROM user_favorites WHERE user_id = $1",
      [userId]
    );
    
   // Fetch additional movie details from OMDB API
   const moviePromises = favoriteMovies.rows.map(async (movie) => {
    const response = await axios.get("https://www.omdbapi.com/", {
      params: {
        apikey: "6f140aea", // Replace with your actual OMDB API key
        i: movie.movie_id,
      },
    });
    return response.data;
  });

  // Resolve all movie promises
  const moviesWithDetails = await Promise.all(moviePromises);

  res.render("dashboard", {
    user: req.user.name,
    favoriteMovies: moviesWithDetails,
  });
} catch (err) {
  console.error("Error fetching favorited movies:", err);
  res.status(500).send("Internal Server Error");
}
});



app.post("/favorites/remove", (req, res) => {
  const movieId = req.body.movieId;
  const userId = req.user.id; // Assuming you have access to the logged-in user's ID

  // Now, you can execute a DELETE query to remove the favorite movie from the database.
  // Use the `pool.query` method to execute the DELETE query.
  // You should have a separate table for favorites where you store the user ID and movie ID.

  // Example query (update it according to your database schema):
  pool.query(
    `DELETE FROM user_favorites WHERE user_id = $1 AND movie_id = $2`,
    [userId, movieId],
    (err, results) => {
      if (err) {
        console.error('Error removing favorite movie:', err);
        res.status(500).json({ error: 'Failed to remove favorite movie' });
      } else {
        res.sendStatus(200);
      }
    }
  );
});






app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
