'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// ── Serialization ──────────────────────────────────────────────────
// Strip passwordHash from any .toJSON() call (API responses, JSON.stringify)
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

// ── Password hashing ───────────────────────────────────────────────
// Hash the password before saving — only when it's been modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Instance method: password comparison ──────────────────────────
userSchema.methods.comparePassword = function (plaintext) {
  return bcrypt.compare(plaintext, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
