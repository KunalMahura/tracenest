'use strict';

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Log = require('../src/models/Log');
const Alert = require('../src/models/Alert');
const AlertRule = require('../src/models/AlertRule');

async function setupTestDB() {
  await connectDB();
}

async function clearTestCollections() {
  try {
    await User.deleteMany({ email: /@test-tracenest\.com$/ });
    await Project.deleteMany({ name: /^TEST_/ });
    await AlertRule.deleteMany({ name: /^TEST_/ });
  } catch (_) {}
}

async function teardownTestDB() {
  await clearTestCollections();
}

module.exports = {
  setupTestDB,
  clearTestCollections,
  teardownTestDB,
};
