const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema({
  userName: {
    type: String,
    unique: true,
    required: true,
  },
  password: { type: String, required: true },
  favourites: [String],
});

let User = mongoose.model("users", userSchema);

module.exports.connect = function () {
  return new Promise((resolve, reject) => {
    mongoose
      .connect(mongoDBConnectionString)
      .then(() => {
        User = mongoose.model("users", userSchema);
        resolve();
      })
      .catch((err) => reject(err));
  });
};

module.exports.registerUser = function (userData) {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      return reject("Passwords do not match");
    }

    bcrypt
      .hash(userData.password, 10)
      .then((hash) => {
        userData.password = hash;

        let newUser = new User(userData);

        newUser
          .save()
          .then(() =>
            resolve("User " + userData.userName + " successfully registered")
          )
          .catch((err) => {
            if (err.code === 11000) {
              reject("User Name already taken");
            } else {
              reject("There was an error creating the user: " + err.message);
            }
          });
      })
      .catch((err) => reject("Error hashing password: " + err.message));
  });
};

module.exports.checkUser = function (userData) {
  return new Promise((resolve, reject) => {
    User.findOne({ userName: userData.userName })
      .exec()
      .then((user) => {
        if (!user) {
          return reject("Unable to find user " + userData.userName);
        }

        bcrypt.compare(userData.password, user.password).then((match) => {
          if (match) {
            resolve(user);
          } else {
            reject("Incorrect password for user " + userData.userName);
          }
        });
      })
      .catch((err) => reject("Database error: " + err.message));
  });
};

module.exports.getFavourites = function (id) {
  return new Promise((resolve, reject) => {
    User.findById(id)
      .exec()
      .then((user) => {
        if (!user) return reject(`User with id ${id} not found`);
        resolve(user.favourites);
      })
      .catch((err) =>
        reject(`Unable to get favourites for user with id: ${id}. ${err.message}`)
      );
  });
};

module.exports.addFavourite = function (id, favId) {
  return new Promise((resolve, reject) => {
    User.findById(id)
      .exec()
      .then((user) => {
        if (!user) return reject(`User with id ${id} not found`);
        if (user.favourites.length >= 50) {
          return reject("Favourites list limit reached (50 items)");
        }

        User.findByIdAndUpdate(
          id,
          { $addToSet: { favourites: favId } },
          { new: true }
        )
          .exec()
          .then((updatedUser) => resolve(updatedUser.favourites))
          .catch((err) =>
            reject(`Unable to update favourites for user with id: ${id}. ${err.message}`)
          );
      })
      .catch((err) => reject("Database error: " + err.message));
  });
};

module.exports.removeFavourite = function (id, favId) {
  return new Promise((resolve, reject) => {
    User.findByIdAndUpdate(
      id,
      { $pull: { favourites: favId } },
      { new: true }
    )
      .exec()
      .then((user) => {
        if (!user) return reject(`User with id ${id} not found`);
        resolve(user.favourites);
      })
      .catch((err) =>
        reject(`Unable to update favourites for user with id: ${id}. ${err.message}`)
      );
  });
};
