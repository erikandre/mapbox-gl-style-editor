#!/usr/bin/env node

var tilelive = require('tilelive');
var path = require('path');
var fs = require("fs");

const MAX_ZOOM = 14;

require('tilelive-bridge').registerProtocols(tilelive);

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

var recursive = false;

// Check for flags
if (args[0] == '-r') {
  console.log('Recursive mode enabled');
  recursive = true;
  args.splice(0, 1);
}

if (args < 4) {
  console.error('Usage tile-conv <mapnik xlm file> <z> <x> <y>');
  process.exit(1);
}

var mapFile = path.resolve(__dirname, args[0]);
var originZ = args[1];
var originX = args[2];
var originY = args[3];

var counter = 0;
var zoomLevels = MAX_ZOOM - originZ;
var totalCount = 0;
if (recursive) {
  while (zoomLevels >= 0 ) {
    totalCount += Math.pow(4, zoomLevels);
    zoomLevels--;
  }
} else {
  totalCount = 1;
}

console.log('Loading data from ' + mapFile);

tilelive.load("bridge://" + mapFile, function(err, source) {
    if (err) throw err;
    if (recursive) {
      processTileRecursive(source, originZ, originX, originY, function() {
        console.log('Done!');
        process.exit(0);
      });
    }
    else {
      processTile(source, originZ, originX, originY, function() {
        console.log('Done!');
        process.exit(0);
      });
    }
});

function processTileRecursive(source, z, x, y, callback) {
  processTile(source, z, x, y, function() {
    if (z == MAX_ZOOM) {
      callback();
      return;
    }
    var nextZ = ++z;
    var nextX = x * 2;
    var nextY = y * 2;
    // Process the four sub quads
    processTileRecursive(source, nextZ, nextX, nextY, function() {
        processTileRecursive(source, nextZ, nextX + 1, nextY, function() {
          processTileRecursive(source, nextZ, nextX, nextY + 1, function() {
            processTileRecursive(source, nextZ, nextX + 1, nextY + 1, function() {
              callback();
            });
          });
        });
    });
  });
}

function processTile(source, z, x, y, callback) {
  console.log('Starting on tile ' + z + ' ' + x + ' ' + y);
  // Interface is in XYZ/Google coordinates.
  // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
  source.getTile(z, x, y, function(err, tile, headers) {
    if (err) throw err;
    // `err` is an error object when generation failed, otherwise null.
    // `tile` contains the compressed tile as a Buffer `headers` is a hash
    // with HTTP headers for the image.
    //console.log(headers);
    var out = fs.createWriteStream('out-' + z + '-' + x + '-' + y + '.pbf');
    out.on('finish', function () {
      counter++;
      console.log('Processed ' + counter + '/' + totalCount);
      callback();
    });
    out.write(tile);
    out.end();
  });
}
