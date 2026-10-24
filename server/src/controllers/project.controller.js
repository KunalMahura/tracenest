'use strict';

const Project = require('../models/Project');

/**
 * POST /api/projects
 * Creates a new project and generates its API key.
 * The raw API key is returned ONCE — it is never stored in the DB.
 */
async function createProject(req, res, next) {
  try {
    const { name, description } = req.body;
    const { rawKey, hash, prefix } = Project.generateApiKey();

    const project = await Project.create({
      userId:       req.user.userId,
      name,
      description,
      apiKeyHash:   hash,
      apiKeyPrefix: prefix,
    });

    return res.status(201).json({
      success: true,
      data: {
        project,
        apiKey: rawKey, // ← Shown once only!
        warning: 'Store your API key now — it cannot be retrieved again',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects
 * Lists all projects owned by the authenticated user.
 */
async function listProjects(req, res, next) {
  try {
    const projects = await Project
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { projects, count: projects.length } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id
 * Returns a single project (must be owned by the requesting user).
 */
async function getProject(req, res, next) {
  try {
    const project = await Project.findOne({
      _id:    req.params.id,
      userId: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:id
 * Deletes a project (must be owned by the requesting user).
 */
async function deleteProject(req, res, next) {
  try {
    const project = await Project.findOneAndDelete({
      _id:    req.params.id,
      userId: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: { message: 'Project deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/regenerate-key
 * Generates a new API key for a project.
 * The old key is immediately invalidated.
 */
async function regenerateApiKey(req, res, next) {
  try {
    const project = await Project.findOne({
      _id:    req.params.id,
      userId: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { rawKey, hash, prefix } = Project.generateApiKey();
    project.apiKeyHash   = hash;
    project.apiKeyPrefix = prefix;
    await project.save();

    res.json({
      success: true,
      data: {
        apiKey: rawKey,
        warning: 'Your old API key is now invalid. Store this new key immediately.',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProject, listProjects, getProject, deleteProject, regenerateApiKey };
