#!/usr/bin/env node

var tilelive = require('tilelive');
var path = require('path');
var fs = require("fs");

require('tilelive-bridge').registerProtocols(tilelive);

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

// Check for flags
if (args[0] == '-r') {
  console.log('Recursive mode enabled');
  args.splice(0, 1);
}

if (args < 4) {
  console.error('Usage tile-conv <mapnik xlm file> <z> <x> <y>');
  process.exit(1);
}

var mapFile = path.resolve(__dirname, args[0]);
var z = args[1];
var x = args[2];
var y = args[3];

console.log('Loading data from ' + mapFile);
tilelive.load("bridge://" + mapFile, function(err, source) {
    if (err) throw err;
    console.log('Requesting tile');
    // Interface is in XYZ/Google coordinates.
    // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
    source.getTile(z, x, y, function(err, tile, headers) {
      if (err) throw err;
      // `err` is an error object when generation failed, otherwise null.
      // `tile` contains the compressed tile as a Buffer `headers` is a hash
      // with HTTP headers for the image.
      console.log('Created tile');
      //console.log(headers);
      var out = fs.createWriteStream('out-' + z + '-' + x + '-' + y + '.pbf');
      out.on('finish', function () {
        console.log('Finished writing to disk');
        process.exit(0);
      });
      out.write(tile);
      out.end();
    });
});
