#!/usr/bin/env node

var path = require('path');
var fs = require("fs");
var xml2js = require('xml2js');

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

if (args.length < 1) {
  console.error('Usage: style-conv <mapnik xlm file>');
  process.exit(1);
}

var idCounter = 0; // Used to ensure that styles have unique ids
var filename = path.resolve(__dirname, args[0]);
console.log('Reading styles from ' + filename);

fs.readFile(filename, 'utf8', function(err, data) {
	if (err) throw err;
	xml2js.parseString(data, function(err, result) {
		if (err) throw err;
		//console.log(JSON.stringify(result.Map.Style, null, 3));
		console.log('Found ' + result.Map.Style.length + ' layers');
		result.Map.Style.forEach(function(layer) {processLayer(layer);});
	});
});

function processLayer(layer) {
	console.log('Processing layer: ' + layer.$.name);
	console.log('Found ' + layer.Rule.length + ' rules');
	layer.Rule.forEach(function(rule) {processRule(rule, layer.$.name, 'map');})
}

function processRule(rule, layername, sourcename) {
	var style = {};
	var paint = {};
	var filter = [];
	style['paint'] = paint;
	style['source'] = sourcename;
	style['source-layer'] = layername;
	style['filter'] = filter;
	var id = layername + '-';
	if (rule.hasOwnProperty('PolygonSymbolizer')) {
		var params = rule.PolygonSymbolizer[0].$; //TODO: Support multiple symbolizers for each rule
		id += 'poly-';
		style['type'] = 'fill';
		if (params.hasOwnProperty('fill')) {
			paint['fill-color'] = params.fill;
		}
		if (params.hasOwnProperty('fill-opacity')) {
			paint['fill-opacity'] = params['fill-opacity'];
		}
	}
	else if (rule.hasOwnProperty('LineSymbolizer')) {
		id += 'line-';
		style['type'] = 'line';
	}
	id += ++idCounter;
	style['id'] = id;
	
	console.log('Created style ' + id);
	console.log(JSON.stringify(style, null, 3));
}
