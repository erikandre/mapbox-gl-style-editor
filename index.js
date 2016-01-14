#!/usr/bin/env node

var tilelive = require('tilelive');
var path = require('path');
var fs = require("fs");
var zlib = require("zlib");

const MAX_ZOOM = 14;

require('tilelive-bridge').registerProtocols(tilelive);

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

var recursive = false;
var compress = false;
var outputPrefix = 'out';

// Check for flags
while (args.length > 0) {
  if (args[0] == '-r') { // Recursive mode
    recursive = true;
    args.splice(0, 1);
  }
  else if (args[0] == '-p') { // Output prefix
    outputPrefix = args[1];
    args.splice(0, 2);
  }
  else if (args[0] == '-c') { // Compression
    compress = true;
    args.splice(0, 1);
  }
  else {
    break; // Done processing flags
  }
}

if (args.length < 4) {
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
  processTile(source, z, x, y, function(empty) {
    if (z == MAX_ZOOM || empty) {
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
  console.log('Processing tile ' + z + ' ' + x + ' ' + y);
  // Interface is in XYZ/Google coordinates.
  // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
  source.getTile(z, x, y, function(err, tile, headers) {
    if (err) {
      counter++;
      callback(true);
      return;
    }
    var fileName = outputPrefix + '-' + z + '-' + x + '-' + y + '.pbf';
    if (compress) {
      fileName += '.gz';
    }
    var finishedCallback = function() {
      counter++;
      console.log('Completed ' + counter + '/' + totalCount);
      callback(false);
    };
    if (compress) {
      writeFile(fileName, tile, finishedCallback);
    }
    else {
      zlib.gunzip(tile, function(err, decompressed) {
        writeFile(fileName, decompressed, finishedCallback);
      });
    }
  });
}

function writeFile(fileName, data, callback) {
  var out = fs.createWriteStream(fileName);
  out.on('finish', function () {
    callback();
  });
  out.write(data);
  out.end();
}
