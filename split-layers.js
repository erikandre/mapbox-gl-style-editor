#!/usr/bin/env node
var tilelive = require('tilelive');
var path = require('path');
var fs = require("fs");
var zlib = require("zlib");
var xml2js = require('xml2js');
require('tilelive-bridge').registerProtocols(tilelive);
var XMLWriter = require('xml-writer');

var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

if (args.length < 1) {
	console.error('Usage: tile-layer-conv.js <Mapnik xml file>');
	process.exit(1);
}

var mapnikFile = path.resolve(__dirname, args[0]);
var outputPrefix = path.parse(mapnikFile).name;

fs.readFile(mapnikFile, 'utf8', function(err, data) {
	splitLayers(data, function() {
		process.exit(0);
	});
});

function splitLayers(mapnikXmlData, callback) {
	fs.readFile(mapnikFile, 'utf8', function(err, data) {
		xml2js.parseString(data, function(err, json) {
			output = [];
			json.Map.Layer.forEach(function(layer) {
				var layerName = layer.$.name;
				var layerXml = createLayerXml(json, layer);
				output.push({
					name : layerName,
					xml : layerXml
				});
			});
			var counter = output.length;
			output.forEach(function(layer) {
				var outputFile = path.resolve(__dirname, 'cache/' + outputPrefix + '-' + layer.name + '.xml');
				fs.writeFile(outputFile, layer.xml, 'utf8', function() {
					counter--;
					if (counter == 0) {
						callback();
					}
				});
			});
		});
	});
}

function createLayerXml(fullJson, layerJson) {
	var xml = new XMLWriter(true);
	xml.startDocument();
	xml.startElement('Map');
	forEachAttribute(fullJson.Map.$, function(key, value) {
		xml.writeAttribute(key, value);
	});
	// Map parameters
	fullJson.Map.Parameters.forEach(function(param) {
		json2xml(xml, param, 'Parameters');
	});
	// The layer itself
	json2xml(xml, layerJson, 'Layer');
	xml.endDocument();
	return xml.toString();
}

function findLayer(layerName, layers) {
	var foundLayer = null;
	layers.some(function(layer) {
		if (layer.$.name == layerName) {
			foundLayer = layer;
			return true;
		}
	});
	if (foundLayer == null) {
		throw new Error('Could not find layer: ' + layerName);
	}
	return foundLayer;
}

function json2xml(writer, object, rootName) {
	// Simple object
	if (typeof object == 'string') {
		writer.writeElement(rootName, object);
		return;
	}
	// Json object
	writer.startElement(rootName);
	if (object.hasOwnProperty('$')) {
		forEachAttribute(object.$, function(key, value) {
			writer.writeAttribute(key, value);
		});
	}
	if (object.hasOwnProperty('_')) {
		writer.text(object._);
	}
	forEachAttribute(object, function(key, value) {
		if (key != '_' && key != '$') {
			if (value.constructor === Array) {
				value.forEach(function(repeatedVal) {
					json2xml(writer, repeatedVal, key);
				});
			} else {
				json2xml(writer, value, key);
			}
		}
	});
	writer.endElement();
}

function forEachAttribute(object, callback) {
	for ( var key in object) {
		if (object.hasOwnProperty(key)) {
			callback(key, object[key]);
		}
	}
}