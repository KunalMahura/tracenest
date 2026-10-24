'use strict';

const { Transform } = require('stream');
const { Buffer } = require('buffer');

/**
 * NDJSONParser — a Transform stream that parses Newline-Delimited JSON.
 *
 * Input:  raw bytes (Buffer) or strings
 * Output: parsed JavaScript objects (objectMode: true)
 *
 * Usage:
 *   const parser = new NDJSONParser();
 *   req.pipe(parser);
 *   parser.on('data', (obj) => console.log(obj));
 *
 * Invalid lines are silently skipped — this prevents one bad line
 * from aborting a large bulk upload.
 */
class NDJSONParser extends Transform {
  constructor(options = {}) {
    // objectMode: true → emits JS objects instead of Buffers
    super({ ...options, objectMode: true });
    this._buffer = ''; // Accumulates partial lines across chunks
  }

  _transform(chunk, _encoding, callback) {
    // Convert Buffer to string and append to our line buffer
    this._buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);

    const lines = this._buffer.split('\n');

    // The last element may be an incomplete line — keep it buffered
    this._buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue; // Skip blank lines

      try {
        this.push(JSON.parse(trimmed));
      } catch {
        // Don't fail the whole stream on one bad line
        process.stderr.write(`[NDJSONParser] Skipping malformed line: ${trimmed.slice(0, 120)}\n`);
      }
    }

    callback();
  }

  _flush(callback) {
    // Handle any remaining data in the buffer when stream ends
    const trimmed = this._buffer.trim();
    if (trimmed) {
      try {
        this.push(JSON.parse(trimmed));
      } catch {
        // Silently discard incomplete/malformed trailing line
      }
    }
    callback();
  }
}

/**
 * collectStream — drains an object-mode Readable stream into an array.
 *
 * @param {Readable} stream  An object-mode stream
 * @returns {Promise<any[]>} Resolves with collected items when stream ends
 */
function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const items = [];
    stream.on('data',  (item) => items.push(item));
    stream.on('end',   ()     => resolve(items));
    stream.on('error', (err)  => reject(err));
  });
}

module.exports = { NDJSONParser, collectStream };
