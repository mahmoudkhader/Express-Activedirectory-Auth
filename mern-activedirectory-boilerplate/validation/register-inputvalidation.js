const Validator = require("validator");

const isEmpty = require("./is-empty-inputvalidation");

module.exports = function validateRegisterInput(data) {
  let errors = {};

  data.email = !isEmpty(data.email) ? data.email : "";
  data.password = !isEmpty(data.password) ? data.password : "";
  data.password2 = !isEmpty(data.password2) ? data.password2 : "";

  if (Validator.isEmpty(data.email)) {
    errors.email = "Email field is required";
  }

  if (!Validator.isEmail(data.email)) {
    errors.email = "Email is invalid";
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = "Please enter your AD password";
  }

  if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
    errors.password =
      "Password must be at least 6 characters and less than 30 characters";
  }

  if (Validator.isEmpty(data.password2)) {
    errors.password2 = "Please confirm your AD password";
  }

  if (!Validator.equals(data.password, data.password2)) {
    errors.password2 = "Passwords must match";
  }

  return {
    errors: errors,

    isValid: isEmpty(errors)
  };
};
