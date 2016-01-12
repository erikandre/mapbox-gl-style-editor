#!/usr/bin/env node

var tilelive = require('tilelive');
var path = require('path');
var fs = require("fs");

require('tilelive-bridge').registerProtocols(tilelive);

if (process.argv.length < 3) {
  console.error('Usage tile-conv <mapnik xlm file> <z> <x> <y>');
  process.exit(1);
}

console.log('Loading data');
tilelive.load("bridge://" + __dirname + "/data/map.xml", function(err, source) {
    if (err) throw err;
    console.log('Requesting tile');
    // Interface is in XYZ/Google coordinates.
    // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
    source.getTile(9, 280, 123, function(err, tile, headers) {
        // `err` is an error object when generation failed, otherwise null.
        // `tile` contains the compressed image file as a Buffer
        // `headers` is a hash with HTTP headers for the image.
        console.log('Created tile');
        console.log(headers);
        console.log(tile.length);
        var out = fs.createWriteStream('out.pbf');
        out.on('finish', function () {
          console.log('Finished writing to disk');
          process.exit(0);
        });
        out.write(tile);
        out.end();

    });

    // The `.getGrid` is implemented accordingly.
});
