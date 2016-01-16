#!/usr/bin/env node

var path = require('path');
var fs = require("fs");
var xml2js = require('xml2js');

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

if (args.length < 3) {
  console.error('Usage: style-conv <mapnik xlm file> <output file> <tile url>');
  process.exit(1);
}

var idCounter = 0; // Used to ensure that styles have unique ids
var filename = path.resolve(__dirname, args[0]);
var outFile = path.resolve(__dirname, args[1]);
var tileUrl = args[2];
console.log('Reading styles from ' + filename);

fs.readFile(filename, 'utf8', function(err, data) {
	if (err) throw err;
	xml2js.parseString(data, function(err, result) {
		if (err) throw err;
		console.log('Found ' + result.Map.Style.length + ' layers');
		var output = [];
		result.Map.Style.forEach(function(layer) {processLayer(output, layer);});
		var glStyle = {};
		// Vector source
		var sources = {};
		var map = {};
		glStyle['version'] = 8;
		map['type'] = 'vector';
		map['tiles'] = [tileUrl];
		map['maxzoom'] = 14; // Read from xml Parameters field
		sources['map'] = map;
		glStyle['sources'] = sources;
		glStyle['layers'] = output;
		var json = JSON.stringify(glStyle, null, 3);
		console.log(json);
		fs.writeFile(outFile, json, 'utf8', function() {
			process.exit(0);
		});
	});
});

function processLayer(output, layer) {
	console.log('Processing layer: ' + layer.$.name);
	console.log('Found ' + layer.Rule.length + ' rules');
	var layerRules = [];
	layer.Rule.forEach(function(rule) {processRule(layerRules, rule, layer.$.name, 'map');})
	layerRules.reverse().forEach(function(rule) {
		output.push(rule);
	});
}

function processRule(output, rule, layername, sourcename) {
	var style = {};
	var paint = {};
	var filter = [];
	style['paint'] = paint;
	style['source'] = sourcename;
	style['source-layer'] = layername;
	var id = layername + '-';
	if (rule.hasOwnProperty('PolygonSymbolizer')) {
		var params = rule.PolygonSymbolizer[0].$; //TODO: Support multiple symbolizers for each rule
		id += 'poly-';
		style['type'] = 'fill';
		if (params.hasOwnProperty('fill')) {
			paint['fill-color'] = params.fill;
		}
		if (params.hasOwnProperty('fill-opacity')) {
			paint['fill-opacity'] = parseFloat(params['fill-opacity']);
		}
	}
	else if (rule.hasOwnProperty('LineSymbolizer')) {
		var params = rule.LineSymbolizer[0].$; //TODO: Support multiple symbolizers for each rule
		id += 'line-';
		style['type'] = 'line';
		if (params.hasOwnProperty('stroke')) {
			paint['line-color'] = params.stroke;
		}
		if (params.hasOwnProperty('stroke-opacity')) {
			paint['line-opacity'] = parseFloat(params['stroke-opacity']);
		}
		if (params.hasOwnProperty('stroke-width')) {
			var lineWidth = {};
			lineWidth['base'] = parseFloat(params['stroke-width']);
			paint['line-width'] = lineWidth;
			//TODO: Generate stops
		}
		lineWidth['stops'] = [[0,1]];
	}
	if (rule.hasOwnProperty('Filter') && rule.Filter.length > 0) {
		var outFilter = [];
		style['filter'] = outFilter;
		rule.Filter.forEach(function(filter) {
			var expr = filter.slice(1, -1);
			var tokens = expr.split(' ');
			if (tokens.length != 3) {
				throw Error('Unexpected number of tokens (' + tokens.length + ') in filter: ' + expr);
			}
			var left = tokens[0];
			var operand = tokens[1];
			var right = tokens[2];
			if (operand == '=') {
				outFilter.push('==');
			}
			else {
				throw Error('Unsupported operand in filter: ' + expr);
			}
			if (left.charAt(0) == '[') {
				left = left.slice(1, -1);
			}
			outFilter.push(left);
			outFilter.push(parseInt(right, 10));
		});
	}
	id += ++idCounter;
	style['id'] = id;
	output.push(style);
	console.log('Created style ' + id);
}
