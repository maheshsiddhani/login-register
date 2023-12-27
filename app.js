const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error 1: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//Register User
app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userCheckQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const userExist = await db.get(userCheckQuery);
  if (userExist === undefined) {
    if (password.length > 5) {
      const addUserQuery = `
            INSERT INTO user(username,name,password,gender,location)
            VALUES ('${username}','${name}','${hashedPassword}','${gender}','${location}');`;
      const registerUser = db.run(addUserQuery);
      const userId = registerUser.lastID;
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login User
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const isUserExist = await db.get(checkUserQuery);
  if (isUserExist !== undefined) {
    const passwordCheck = await bcrypt.compare(password, isUserExist.password);
    if (passwordCheck) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//Password Change
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const userQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const user = await db.get(userQuery);
  if (user !== undefined) {
    const comparePassword = await bcrypt.compare(oldPassword, user.password);
    if (comparePassword) {
      if (newPassword.length > 5) {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = `
            UPDATE user
            SET password = '${encryptedPassword}'
            WHERE username = '${username}';`;
        await db.run(updatePassword);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.send("User not registered at");
    response.status(400);
  }
});

module.exports = app;
