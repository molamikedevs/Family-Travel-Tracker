import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import 'dotenv/config'

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT_NUMBER,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisited() {
  try {
    const result = await db.query(
      "SELECT country_code FROM visited_countries WHERE user_id = $1;",
      [currentUserId]
    );
    
    const countries = result.rows.map((row) => row.country_code);
    return countries;
  } catch (err) {
    console.error("Error in checkVisited function:", err);
    throw err; // Rethrow the error for proper handling in the route
  }
}


async function getUsersFromDatabase() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

async function getCurrentUserFromDatabase() {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [currentUserId]);
  return result.rows[0];
}


app.get("/", async (req, res) => {
  try {
    const countries = await checkVisited();
    const currentUser = await getCurrentUserFromDatabase();
    const allUsers = await getUsersFromDatabase();

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: allUsers,
      color: currentUser.color,
    });
  } catch (err) {
    console.error("Error in / route:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUserFromDatabase();

  try {
    const result = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
    [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;

  try {
    await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES($1, $2)",
    [countryCode, currentUserId]);
    res.redirect("/")
  } catch (error) {
    
  }

  } catch (error) {
    console.log(error)
  }
})


app.post("/user", async (req, res) => {
  try {
    if (req.body.add === "new") {
      res.render("new.ejs");
    } else {
      currentUserId = req.body.user;
      res.redirect("/");
    }
  } catch (err) {
    console.error("Error in /user route:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/new", async (req, res) => {
  try {
    const name = req.body.name;
    const color = req.body.color;

    // Insert new user into the users table
    const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;", [name, color]);

    // Get the user ID from the inserted row
    const id = result.rows[0].id;

    // Update currentUserId
    currentUserId = id;

    // Redirect to the home page
    res.redirect("/");
  } catch (err) {
    console.error("Error in /new route:", err);
    res.status(500).send("Internal Server Error");
  }
});




app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
