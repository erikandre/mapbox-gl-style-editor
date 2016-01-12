#!/usr/bin/env node

var tilelive = require('tilelive');
var path = require('path');
var fs = require("fs");

require('tilelive-bridge').registerProtocols(tilelive);

if (process.argv.length < 6) {
  console.error('Usage tile-conv <mapnik xlm file> <z> <x> <y>');
  process.exit(1);
}

var mapFile = path.resolve(__dirname, process.argv[2]);
var z = process.argv[3];
var x = process.argv[4];
var y = process.argv[5];

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
