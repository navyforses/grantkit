/**
 * Data-processing utilities for GrantKit.
 *
 * Security/stability fix: Added null checks for `userData` and `userData.email`
 * in processData() to prevent null pointer exceptions when the caller passes
 * incomplete or missing input.
 */

"use strict";

/**
 * Process a user-data object and return a normalised representation.
 *
 * @param {object|null|undefined} userData - Raw user data from an API or form.
 * @param {string} userData.email          - The user's e-mail address (required).
 * @returns {{ email: string }}             Normalised user record.
 * @throws {Error} When userData or userData.email is null/undefined.
 */
function processData(userData) {
  // Guard against null/undefined input and a missing or empty email address
  // before accessing nested properties.  Without these checks, accessing
  // userData.email on a null/undefined value throws a TypeError at runtime.
  // An empty string is also rejected because a blank email is not valid.
  if (userData == null || !userData.email) {
    throw new Error("Invalid user data: email is required");
  }

  return {
    email: userData.email.trim().toLowerCase(),
  };
}

module.exports = { processData };
