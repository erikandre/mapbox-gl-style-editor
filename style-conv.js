#!/usr/bin/env node
module.exports = {
	convertStyle : function(xml, tileUrl, callback) {
		convert(xml, tileUrl, function(jsonStyle) {
			callback(jsonStyle);
		});
	}
};

var path = require('path');
var fs = require("fs");
var xml2js = require('xml2js');

var idCounter = 0; // Used to ensure that styles have unique ids

if (require.main == module) {
	main();
}

function main() {
	var args = process.argv;
	args.splice(0, 2); // Remove 'node' and the name of the script

	if (args.length < 3) {
		console.error('Usage: style-conv <mapnik xlm file> <output file> <tile url>');
		process.exit(1);
	}
	var filename = path.resolve(__dirname, args[0]);
	var outFile = path.resolve(__dirname, args[1]);
	var tileUrl = args[2];
	convert(filename, tileUrl, function(jsonStyle) {
		// console.log(jsonStyle);
		fs.writeFile(outFile, jsonStyle, 'utf8', function() {
			process.exit(0);
		});
	});
}

function convert(xmlFile, tileUrl, callback) {
	fs.readFile(xmlFile, 'utf8', function(err, data) {
		if (err)
			throw err;
		xml2js.parseString(data, function(err, result) {
			if (err)
				throw err;
			console.log('Found ' + result.Map.Style.length + ' layers');
			var output = [];
			result.Map.Style.forEach(function(layer) {
				processLayer(output, layer);
			});
			// Sort by layer type
			output.sort(function(left, right) {
				return getLayerTypeSortingValue(left.type) - getLayerTypeSortingValue(right.type);
			});
			var glStyle = {};
			// Vector source
			var sources = {};
			var map = {};
			glStyle['version'] = 8;
			map['type'] = 'vector';
			map['tiles'] = [ tileUrl ];
			map['maxzoom'] = 14; // Read from xml Parameters field
			sources['map'] = map;
			glStyle['glyphs'] = 'http://localhost:8080/font?name={fontstack}&range={range}.pbf';
			glStyle['sources'] = sources;
			glStyle['layers'] = output;
			var json = JSON.stringify(glStyle, null, 3);
			callback(json);
		});
	});
}

function getLayerTypeSortingValue(type) {
	if (type == 'fill') {
		return 0;
	}
	else if (type == 'line') {
		return 1;
	}
	else if (type == 'circle') {
		return 1;
	}
	else if (type == 'symbol') {
		return 2;
	}
	throw Error('Type not supported: ' + type);
}

function processLayer(output, layer) {
	console.log('Processing layer: ' + layer.$.name);
	var layerRules = [];
	var mergedRules = mergeRules(layer.Rule);
	mergedRules.forEach(function(rule) {
		try {
			processRule(layerRules, rule, layer.$.name, 'map');
		} catch (err) {
			if (err == 'skip') {
				console.error('Skipped problematic rule: ' + JSON.stringify(rule, null, 3));
			} else {
				throw err;
			}
		}
	})
	layerRules.forEach(function(rule) {
		cleanupStops(rule);
		output.push(rule);
	});
}

function cleanupStops(rule) {
	if (rule.paint.hasOwnProperty('line-width')) {
		var lineWidth = rule.paint['line-width'];
		if (lineWidth.hasOwnProperty('stops')) {
			var stops = lineWidth['stops'];
			stops.forEach(function(stop) {
				if (stop.length = 3) {
					stop.pop();
				}
			});
		}
	}
}

function mergeRules(rules) {
	var ruleMap = {};
	rules.forEach(function(rule) {
		var key = getRuleKey(rule);
		if (ruleMap.hasOwnProperty(key)) {
			ruleMap[key].push(rule);
		} else {
			ruleMap[key] = [ rule ];
		}
	});
	var result = [];
	for ( var key in ruleMap) {
		if (ruleMap.hasOwnProperty(key)) {
			var group = ruleMap[key];
			if (canMergeRules(group)) {
				console.log('Merging ' + ruleMap[key].length + ' rules');
				result.push(group);
			} else {
				result.push(group[0]);
			}
		}
	}
	return result;
}

function canMergeRules(rules) {
	var main = rules[0];
	return (rules.length > 1 && main.hasOwnProperty('LineSymbolizer') && !main.hasOwnProperty('PolygonSymbolizer')
			&& !main.hasOwnProperty('PolygonPatternSymbolizer') && !main.hasOwnProperty('MarkersSymbolizer') && !main.hasOwnProperty('TextSymbolizer'));
}

function getRuleKey(rule) {
	var key = 'key-';
	if (rule.hasOwnProperty('Filter')) {
		key += JSON.stringify(rule['Filter']);
	} else {
		key += 'noFilter';
	}
	key += '-';
	if (rule.hasOwnProperty('PolygonSymbolizer')) {
		key += 'PolygonSymbolizer'
	}
	if (rule.hasOwnProperty('PolygonPatternSymbolizer')) {
		key += 'PolygonPatternSymbolizer';
	}
	if (rule.hasOwnProperty('LineSymbolizer')) {
		key += 'LineSymbolizer';
	}
	if (rule.hasOwnProperty('MarkersSymbolizer')) {
		key += 'MarkersSymbolizer';
	}
	if (rule.hasOwnProperty('TextSymbolizer')) {
		key += 'TextSymbolizer';
	}
	return key;
}

function mergeStyles(styles) {
	// TODO Support other symbolizers
	var stops = [];
	var minZoom = null;
	var maxZoom = null;
	styles.forEach(function(style) {

		style.paint['line-width'].stops.forEach(function(stop) {
			if (stop.length == 2) { // Filter out extrapolated stops
				if (style.hasOwnProperty('minzoom')) {
					if (minZoom == null || style.minzoom < minZoom) {
						minZoom = style.minzoom;
					}
				}
				if (style.hasOwnProperty('maxzoom')) {
					if (maxZoom == null || style.maxzoom < maxZoom) {
						maxZoom = style.maxzoom;
					}
				}
				stops.push(stop);
			}
		})
	});
	// Remove conflicting stops
	var filteredStops = [];
	var levels = {};
	stops.forEach(function(stop) {
		if (!levels.hasOwnProperty(stop[0])) {
			levels[stop[0]] = 1;
			filteredStops.push(stop);
		}
	});
	// Add stops for zoom limits
	filteredStops.forEach(function(stop) {
		if (stop[0] < minZoom) {
			minZoom = null;
		}
		if (stop[0] > maxZoom) {
			maxZoom = null;
		}
	});
	var result = styles[0];
	if (minZoom != null) {
		filteredStops.push([ minZoom, 0 ]);
		result.minzoom = minZoom;
	}
	if (maxZoom != null) {
		filteredStops.push([ maxZoom, 0 ]);
		result.maxzoom = maxZoom;
	}
	// Sort stops in ascending order
	filteredStops.sort(function(a, b) {
		return a[0] - b[0];
	});

	result.paint['line-width'].stops = filteredStops;
	return result;
}

function processRule(output, rule, layername, sourcename) {
	if (isArray(rule)) {
		var styleGroup = [];
		rule.forEach(function(subRule) {
			processRule(styleGroup, subRule, layername, sourcename);
		});
		output.push(mergeStyles(styleGroup));
		return;
	}
	var style = {};
	var paint = {};
	var layout = {};
	var filter = [];
	var id = layername + '-';
	id += ++idCounter;
	style['id'] = id;
	style['source'] = sourcename;
	style['source-layer'] = layername;
	if (!ruleHasVisualizer(rule)) {
		throw Error('No or unsupported symbolizer in rule: ' + JSON.stringify(rule, null, 3));
	}
	var fill = false;
	var text = false;
	var marker = false;
	var zoom = {};
	if (rule.hasOwnProperty('MaxScaleDenominator')) {
		zoom.min = getZoomLevel(rule['MaxScaleDenominator'][0]);
	}
	if (rule.hasOwnProperty('MinScaleDenominator')) {
		zoom.max = getZoomLevel(rule['MinScaleDenominator'][0]);
	}
	if (rule.hasOwnProperty('PolygonSymbolizer')) {
		fill = true;
		processPolygonSymbolizer(rule, style, paint);
	}
	if (rule.hasOwnProperty('PolygonPatternSymbolizer')) {
		fill = true;
		processPolygonPatternSymbolizer(rule, style, paint);
	}
	if (rule.hasOwnProperty('TextSymbolizer')) {
		text = true;
		processTextSymbolizer(rule, style, layout, paint);
	}
	if (rule.hasOwnProperty('MarkersSymbolizer')) {
		if (text) {
			// Since we cannot combine these to in a gl style we need to split it into two styles
			// Clone the object, remove the text symbolizer and process the copy
			var markerRule = cloneDataObject(rule);
			delete markerRule['TextSymbolizer'];
			processRule(output, markerRule, layername, sourcename);
		} else {
			marker = true;
			processMarkersSymbolizer(rule, style, paint);
		}
	}
	if (rule.hasOwnProperty('LineSymbolizer')) {
		if (marker) {
			// Ignore LineSymbolizer for markers (since gl styles do not support circle outlines)
		} else if (fill) {
			// Mapnik uses LineSymbolizer for fill outlines as well
			processFillOutline(rule, style, paint);
		} else if (text) {
			// This means that this is a line text, with an line drawn in (debug?)
			// Let's stip the TextSymbolizer and process the rule again
			var lineRule = cloneDataObject(rule);
			delete lineRule['TextSymbolizer'];
			processRule(output, lineRule, layername, sourcename);
		} else {
			processLineSymbolizer(rule, style, paint, zoom);
		}
	}
	if (rule.hasOwnProperty('Filter') && rule.Filter.length > 0) {
		style['filter'] = processFilter(rule.Filter);
	}
	if (zoom.hasOwnProperty('min')) {
		style['minzoom'] = zoom.min;
	}
	if (zoom.hasOwnProperty('max')) {
		style['maxzoom'] = zoom.max;
	}
	style['paint'] = paint;
	style['layout'] = layout;
	output.push(style);
}

function processTextSymbolizer(rule, layer, layout, paint) {
	// TODO: Support multiple symbolizers for each rule
	var params = rule.TextSymbolizer[0].$;
	layer['type'] = 'symbol';
	layout['text-field'] = '{' + processOperand(rule.TextSymbolizer[0]._) + '}';
	if (params.hasOwnProperty('face-name')) {
		// layout['text-font'] = [ params['face-name'] ];
	}
	if (params.hasOwnProperty('fill')) { // Text color
		paint['text-color'] = params['fill'];
	}
	if (params.hasOwnProperty('halo-fill')) {
		paint['text-halo-color'] = params['halo-fill'];
	}
	if (params.hasOwnProperty('halo-radius')) {
		paint['text-halo-width'] = processOperand(params['halo-radius']);
	}
	if (params.hasOwnProperty('size')) {
		layout['text-size'] = processOperand(params['size']);
	}
	if (params.hasOwnProperty('placement')) {
		layout['symbol-placement'] = params['placement'];;
	}
	// Currently Mapbox GL does not support using an expression (referncing a field) to specify rotation
	// if (params.hasOwnProperty('orientation')) {
	// layout['text-rotate'] = '{' + processOperand(params['orientation']) + '}';
	// }
	layout['text-anchor'] = processTextAlignment(params);
}

function processPolygonPatternSymbolizer(rule, style, paint) {
	// TODO: Support multiple symbolizers for each rule
	var params = rule.PolygonPatternSymbolizer[0].$;
	style['type'] = 'fill';
	paint['fill-pattern'] = params.file;
}

function processMarkersSymbolizer(rule, style, paint) {
	// TODO: Support multiple symbolizers for each rule
	var params = rule.MarkersSymbolizer[0].$;
	if (params.hasOwnProperty('file')) {
		style['icon-image'] = params['file'];
		style['type'] = 'symbol';
		if (params.hasOwnProperty('allow-overlap')) {
			style['icon-allow-overlap'] = params['allow-overlap'];
		}
	} else if (params.hasOwnProperty('width') || params.hasOwnProperty('height')) {
		style['type'] = 'circle';
		var width = 0;
		if (params.hasOwnProperty('width')) {
			width = parseFloat(params['width']);
		}
		var height = 0;
		if (params.hasOwnProperty('height')) {
			height = parseFloat(params['height']);
		}
		paint['circle-radius'] = Math.max(width, height) / 2;
		if (params.hasOwnProperty('fill')) {
			paint['circle-color'] = params['fill'];
		}
	} else {
		throw 'skip';
	}
}

function processPolygonSymbolizer(rule, style, paint) {
	// TODO: Support multiple symbolizers for each rule
	var params = rule.PolygonSymbolizer[0].$;
	style['type'] = 'fill';
	if (params.hasOwnProperty('fill')) {
		paint['fill-color'] = params.fill;
	}
	if (params.hasOwnProperty('fill-opacity')) {
		paint['fill-opacity'] = parseFloat(params['fill-opacity']);
	}
}

function processFillOutline(rule, style, paint) {
	// TODO: Support multiple symbolizers for each rule
	var params = rule.LineSymbolizer[0].$;
	if (params.hasOwnProperty('stroke-width')) {
		if (parseFloat(params['stroke-width'], 10) == 0) {
			return; // Skip outline if the width is 0
		}
	}
	if (params.hasOwnProperty('stroke')) {
		paint['fill-outline-color'] = params.stroke;
	}
}

function processLineSymbolizer(rule, style, paint, zoom) {
	// TODO: Support multiple symbolizers for each rule
	var params = rule.LineSymbolizer[0].$;
	style['type'] = 'line';
	if (params.hasOwnProperty('stroke')) {
		paint['line-color'] = params.stroke;
	}
	if (params.hasOwnProperty('stroke-opacity')) {
		paint['line-opacity'] = parseFloat(params['stroke-opacity']);
	}
	if (params.hasOwnProperty('stroke-width')) {
		var lineWidth = {};
		paint['line-width'] = lineWidth;
		lineWidth['base'] = 1.0;
		// Generate stops
		var width = parseFloat(params['stroke-width']);
		var stops = [];
		if (zoom.hasOwnProperty('min')) {
			// Add extra element to keep track of which ones are extrapolated
			stops.push([ zoom.min - 1, 0.0, 0 ]);
			stops.push([ zoom.min, width ]);
			zoom.min--;
		}
		if (zoom.hasOwnProperty('max')) {
			// Add extra element to keep track of which ones are extrapolated
			stops.push([ zoom.max, width ]);
			stops.push([ zoom.max + 1, 0, 0 ]);
			zoom.max++;
		}
		if (zoom.length == 0) {
			stops.push([ 0, width ]);
		}
		lineWidth['stops'] = stops;
		// Easier if we make dash dependent on the stroke
		if (params.hasOwnProperty('stroke-dasharray')) {
			paint['line-dasharray'] = processDashArray(params['stroke-dasharray'], width);
		}
	}
}

function processDashArray(value, width) {
	var result = [];
	value.split(',').forEach(function(token) {
		result.push(Math.min(1, parseInt(token, 10) / width) * 2.5);
	});
	return result;
}

function processFilter(filters) {
	var outFilter = [];
	var target = outFilter;
	filters.forEach(function(filter) {
		var expressions = splitFilterExpressions(filter);
		expressions.forEach(function(expr) {
			if (isFilterOperator(expr)) {
				var lastExpr = target.pop();
				target = [];
				outFilter.push(target);
				target.push(processFilterOperator(expr));
				target.push(lastExpr);
			} else {
				target.push(processExpression(expr));
				if (target != outFilter) {
					target = outFilter; // Compound expression finished
				}
			}
		});
	});
	if (filters.length > 1) {
		throw Error('Invalid filter, merging failed! ' + filters);
	}
	// console.log('Filters: ' + outFilter[0]);
	return outFilter[0];
}

function processExpression(expr) {
	var output = [];
	var tokens = expr.split(' ');
	if (tokens.length != 3) {
		throw Error('Unexpected number of tokens (' + tokens.length + ') in filter: ' + expr);
	}
	var left = tokens[0];
	var operator = tokens[1];
	var right = tokens[2];
	output.push(processOperator(operator));
	output.push(processOperand(left));
	output.push(processOperand(right));
	return output;
}

function processOperator(value) {
	if (value == '=') {
		return '==';
	} else {
		return value; // Other operators are the same for GL styles and Mapnik
	}
}

function processOperand(value) {
	if (value.indexOf('[') != -1) {
		return value.substring(1, value.length - 1);
	} else {
		var intVal = parseInt(value, 10);
		var floatVal = parseFloat(value);
		if (intVal == floatVal) {
			return intVal;
		} else {
			return floatVal;
		}
	}
}

function splitFilterExpressions(filter) {
	var expressions = [];
	while (filter.indexOf('(') != -1) {
		var start = filter.indexOf('(');
		if (start > 0) {
			// There should be an operating before the start of the expression
			expressions.push(filter.substring(0, start).trim());
		}
		var end = filter.indexOf(')');
		expressions.push(filter.slice(start + 1, end));
		filter = filter.substring(end + 1, filter.length);
	}
	return expressions;
}

function isFilterOperator(value) {
	return (value == 'and' || value == 'or');
}

function processFilterOperator(value) {
	if (value == 'and') {
		return 'all';
	} else if (value == 'or') {
		return 'any';
	}
	throw new Error('Unsupported operator ' + value);
}

function ruleHasVisualizer(rule) {
	return rule.hasOwnProperty('PolygonSymbolizer') || rule.hasOwnProperty('PolygonPatternSymbolizer') || rule.hasOwnProperty('LineSymbolizer')
			|| rule.hasOwnProperty('MarkersSymbolizer') || rule.hasOwnProperty('TextSymbolizer');
	;
}

function getZoomLevel(value) {
	var table = {
		1000000000 : 0,
		500000000 : 1,
		200000000 : 2,
		100000000 : 3,
		50000000 : 4,
		25000000 : 5,
		12500000 : 6,
		6500000 : 7,
		3000000 : 8,
		1500000 : 9,
		750000 : 10,
		400000 : 11,
		200000 : 12,
		100000 : 13,
		50000 : 14,
		25000 : 15,
		12500 : 16,
		5000 : 17,
		2500 : 18,
		1500 : 19,
		750 : 20,
		500 : 21,
		250 : 22,
		100 : 23
	};
	return table[parseInt(value, 10)];
}

function processTextAlignment(params) {
	var vert = 'middle';
	var horiz = 'middle';
	if (params.hasOwnProperty('text-vertical-alignment')) {
		vert = params['text-vertical-alignment'];
	}
	if (params.hasOwnProperty('text-horizontal-alignment')) {
		horiz = params['text-horizontal-alignment'];
	}
	if (vert == 'auto') {
		vert = 'middle';
	}
	if (horiz == 'auto') {
		horiz = 'middle';
	}
	if (horiz == 'left' && vert == 'top') {
		return 'top-left';
	}
	if (horiz == 'middle' && vert == 'top') {
		return 'top';
	}
	if (horiz == 'right' && vert == 'top') {
		return 'top-right';
	}
	if (horiz == 'left' && vert == 'middle') {
		return 'left';
	}
	if (horiz == 'middle' && vert == 'middle') {
		return 'center';
	}
	if (horiz == 'right' && vert == 'middle') {
		return 'right';
	}
	if (horiz == 'left' && vert == 'bottom') {
		return 'bottom-left';
	}
	if (horiz == 'middle' && vert == 'bottom') {
		return 'bottom';
	}
	if (horiz == 'right' && vert == 'bottom') {
		return 'bottom-right';
	}
	throw Error('Invalid text alignment: ' + params);
}

function isArray(o) {
	return Object.prototype.toString.call(o) === '[object Array]';
}

function cloneDataObject(object) {
	return JSON.parse(JSON.stringify(object));
}
