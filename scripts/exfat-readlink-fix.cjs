"use strict";

/**
 * exFAT compatibility shim.
 *
 * This project lives on an exFAT volume (the E: drive). exFAT cannot store
 * symbolic links, and on such volumes Windows/libuv makes `fs.readlink` throw
 * `EISDIR` for regular files and directories instead of the POSIX-standard
 * `EINVAL`.
 *
 * Build tooling (webpack's enhanced-resolve, Next.js page-data collection,
 * Node's own realpath) probes paths with `readlink` to detect symlinks and
 * only expects `EINVAL` / `ENOENT` / `UNKNOWN` for non-symlinks. The stray
 * `EISDIR` is uncaught and crashes the build.
 *
 * Since exFAT can never hold a symlink, every readlink target is guaranteed
 * not to be one — so remapping `EISDIR` to `EINVAL` is always correct here.
 *
 * Loaded via `node --require` (see the NODE_OPTIONS in package.json scripts)
 * so it patches `fs` before any other module is evaluated.
 */

const fs = require("fs");

if (!fs.__exfatReadlinkPatched) {
  fs.__exfatReadlinkPatched = true;

  const remap = (err) => {
    if (err && err.code === "EISDIR" && err.syscall === "readlink") {
      const fixed = new Error(
        String(err.message || "EISDIR: illegal operation").replace(
          "EISDIR",
          "EINVAL",
        ),
      );
      fixed.code = "EINVAL";
      fixed.errno = -4071; // UV_EINVAL on Windows
      fixed.syscall = "readlink";
      if (err.path !== undefined) fixed.path = err.path;
      return fixed;
    }
    return err;
  };

  const readlinkSync = fs.readlinkSync;
  fs.readlinkSync = function patchedReadlinkSync(...args) {
    try {
      return readlinkSync.apply(fs, args);
    } catch (err) {
      throw remap(err);
    }
  };

  const readlink = fs.readlink;
  fs.readlink = function patchedReadlink(...args) {
    const last = args.length - 1;
    if (typeof args[last] === "function") {
      const cb = args[last];
      args[last] = (err, ...rest) => cb(remap(err), ...rest);
    }
    return readlink.apply(fs, args);
  };

  if (fs.promises && fs.promises.readlink) {
    const readlinkPromise = fs.promises.readlink;
    fs.promises.readlink = function patchedReadlinkPromise(...args) {
      return readlinkPromise.apply(fs.promises, args).catch((err) => {
        throw remap(err);
      });
    };
  }
}
