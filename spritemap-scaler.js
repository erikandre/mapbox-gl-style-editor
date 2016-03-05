#!/usr/bin/env node
var path = require('path');
var fs = require("fs");

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

var recursive = false;
var compress = false;
var outputPrefix = null;

if (args.length < 2) {
	console.error('Usage spritemap-scaler.js <spritemap json file> <scale factor>');
	process.exit(1);
}

var jsonFile = path.resolve(__dirname, args[0]);
var scale = parseFloat(args[1]);

var map = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

for(var key in map) {
	var sprite = map[key];
	sprite['width'] = ~~(sprite['width'] * scale);
	sprite['height'] = ~~(sprite['height'] * scale);
	sprite['x'] = ~~(sprite['x'] * scale);
	sprite['y'] = ~~(sprite['y'] * scale);
}
console.log(JSON.stringify(map, null, 3));

function writeFile(fileName, data, callback) {
	var out = fs.createWriteStream(fileName);
	out.on('finish', function() {
		callback();
	});
	out.write(data);
	out.end();
}
