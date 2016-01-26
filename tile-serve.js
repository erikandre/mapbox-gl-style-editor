#!/usr/bin/env node
var tilelive = require('tilelive');
var path = require('path');
var http = require("http");
var url = require('url');
var fs = require("fs");
var qs = require('querystring');
var styleConv = require('./style-conv');
var layerSplitter = require('./split-layers');
require('tilelive-bridge').registerProtocols(tilelive);

var host = 'http://192.168.0.2:8080';
//var host = 'http://localhost:8080';
var port = 8080;
var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

if (args.length < 1) {
	console.error('Usage: tile-serve <mapnik xlm file>');
	process.exit(1);
}

var staticStyle = null;
if (args[0] == '-s') { // Static style
	staticStyle = args[1];
	args.splice(0, 2);
}

var mapFile = path.resolve(__dirname, args[0]);
var cacheDir = 'cache/';
var cachePrefix = path.parse(mapFile).name;

// Create Mapnik setups for each of the layers
fs.readFile(mapFile, 'utf8', function(err, file) {
	layerSplitter.splitLayers(file, cacheDir, cachePrefix, function() {
		startServer();
	});
});

function startServer() {
	console.log('Serving tiles from ' + mapFile + " at port " + port);
	http.createServer(function(request, response) {
		// Parse request to get tile coordinates
		console.log('Raw URL: ' + request.url);
		var parsedUrl = url.parse(request.url);
		if (parsedUrl.pathname == '/') {
			// Serve the main html page
			serveMapPage(response);
		} else if (parsedUrl.pathname == '/style.json') {
			// Serve the map style
			serveStyle(response, mapFile);
		} else if (parsedUrl.pathname == '/favicon.ico') {
			// Ignored
			response.writeHead(404);
			response.end();
		} else if (parsedUrl.pathname == '/font') {
			serveFont(response, parsedUrl);
		} else {
			serveTile(parsedUrl, response);
		}
	}).listen(port);
}

function serveTile(url, response) {
	var query = url.query;
	var params = qs.parse(query);
	console.log('Requested z=' + params.z + ', x=' + params.x + ', y=' + params.y + ' of source=' + params.source);
	var cacheKey = getCacheKey(params.source, params.z, params.x, params.y);
	loadFromCache(cacheKey, function(cachedTile) {
		console.log('Loaded tile from cache');
		var headers = {
			'Content-Type' : 'application/x-protobuf',
			'Content-Encoding' : 'gzip',
			'x-tilelive-contains-data' : true
		};
		response.writeHead(200, 'OK', headers);
		response.write(cachedTile, 'binary');
		response.end();
	}, function() {
		// Cache miss
		openTileSource(params.source, function(source) {
			source.getTile(params.z, params.x, params.y, function(err, tile, headers) {
				if (err) {
					response.writeHead(200);
					response.end();
					console.error(err);
					return;
				}
				writeToCache(getCacheKey(params.source, params.z, params.x, params.y), tile, function() {
					// Return response after saving to cache
					response.writeHead(200, 'OK', headers);
					response.write(tile, 'binary');
					response.end();
				});
			});
		});
	});
}

function openTileSource(source, callback) {
	var start = Date.now();
	var url = 'bridge://' + path.resolve(__dirname, cacheDir + cachePrefix + '-' + source + '.xml');
	tilelive.load(url, function(err, source) {
		if (err)
			throw err;
		console.log('Opened source in ' + (Date.now() - start) + 'ms');
		callback(source);
	});
}

function getCacheKey(source, z, x, y) {
	return cacheDir + cachePrefix + '-' + source + '-' + z + '-' + x + '-' + y + '.pbf';
}

function serveFont(response, url) {
	var query = url.query;
	var params = qs.parse(query);
	var fileName = path.resolve(__dirname, 'font/' + params.name.split(',')[0] + '/' + params.range);
	fs.readFile(fileName, 'binary', function(err, file) {
		if (err) {
			throw err;
		}
		response.writeHead(200);
		response.write(file, 'binary');
		response.end();
	});
}

function loadFromCache(key, hit, miss) {
	var fileName = path.resolve(__dirname, key);
	fs.readFile(fileName, 'binary', function(err, file) {
		if (err) {
			miss();
		} else {
			hit(file);
		}
	});
}

function writeToCache(key, tile, callback) {
	var fileName = path.resolve(__dirname, key);
	fs.writeFile(fileName, tile, 'binary', callback);
}

function serveStyle(response, mapFile) {
	if (staticStyle != null) {
		fs.readFile( path.resolve(__dirname, staticStyle), 'utf8', function(err, file) {
			serveStringResponse(response, file);
		});
	} else {
		styleConv.convertStyle(mapFile, host, '/map', function(jsonStyle) {
			serveStringResponse(response, jsonStyle);
		});
	}
}

function serveMapPage(response) {
	fs.readFile(path.resolve(__dirname, 'index.html'), 'utf8', function(err, file) {
		if (err)
			throw err;
		serveStringResponse(response, file);
	});
}

function serveStringResponse(response, data) {
	response.writeHead(200);
	response.write(data, 'utf8');
	response.end();
}
