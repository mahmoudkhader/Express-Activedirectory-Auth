const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const validateRegisterInput = require("../../validation/register-inputvalidation");
const validateLoginInput = require("../../validation/login-inputvalidation");
const User = require("../../models/User");
const ActiveDirectory = require("activedirectory");

// New user route
//      Checks if that user is an authorized user in your company and allows you to dictate access
router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const email = req.body.email;
  const password = req.body.password;

  const config = {
    url: "ldap://servername.yourcompany.com",
    baseDN: "DC=yourcompany,DC=com",
    username: `${email}`,
    password: password
  };
  const ad = new ActiveDirectory(config);

  ad.authenticate(config.username, config.password, function(err, auth) {
    if (err) {
      console.log("Authentication failed!");
      console.log("ERROR: " + JSON.stringify(err));
      errors.email = "Please use an authorized yourcompany login";
      errors.password = "Please use an authorized yourcompany login";
      return res.status(404).json(errors);
    }

    if (auth) {
      console.log("Authenticated!");

      User.findOne({ email: req.body.email }).then(user => {
        if (user) {
          errors.email =
            "Looks like you're already registered. Please use the login page.";
          return res.status(400).json(errors);
        } else {
          const sAMAccountName = email;
          ad.findUser(sAMAccountName, function(err, yourcompanyUser) {
            if (err) {
              console.log("ERROR: " + JSON.stringify(err));
              return;
            }
            if (!yourcompanyUser)
              console.log("User: " + sAMAccountName + " not found.");
            else {
              console.log(JSON.stringify(yourcompanyUser));
              console.log(yourcompanyUser.mail);
              const newUser = new User({
                firstName: yourcompanyUser.givenName,
                lastName: yourcompanyUser.sn,
                email: yourcompanyUser.mail
              });
              newUser
                .save()
                .then(user => res.json(user))
                .catch(err => console.log(err));
            }
          });
        }
      });
    } else {
      console.log(
        "Unknown authentication error. Steps to resolve: 1- Clear browser cache/history; 2- Try again; 3- Contact admin"
      );
    }
  });
});

// Login route
//      This route checks if the user is authenticated first by your AD server, and if they are then it checks if they exist in your mongo database
router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  const config = {
    url: "ldap://servername.yourcompany.com",
    baseDN: "DC=yourcompany,DC=com",
    username: `${email}`,
    password: password
  };
  const ad = new ActiveDirectory(config);

  ad.authenticate(config.username, config.password, function(err, auth) {
    if (err) {
      console.log("Authentication failed!");
      console.log("ERROR: " + JSON.stringify(err));
      errors.email = "Incorrect username or password";
      errors.password = "Incorrect username or password";
      return res.status(404).json(errors);
    }

    if (auth) {
      console.log("Authenticated!");
      User.findOne({ email }).then(user => {
        if (!user) {
          errors.email =
            "Uh oh, looks like you don't have access yet! Please request access and try again.";
          return res.status(404).json(errors);
        } else if (user) {
          const payload = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName
          };
          jwt.sign(
            payload,
            keys.secretOrKey,
            { expiresIn: 3600 },
            (err, token) => {
              res.json({
                success: true,
                token: "Bearer " + token
              });
            }
          );
        }
      });
    } else {
      console.log(
        "Unknown authentication error. Steps to resolve: 1- Clear browser cache/history; 2- Try again; 3- Contact admin"
      );
    }
  });
});
module.exports = router;
