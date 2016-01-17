#!/usr/bin/env node
var tilelive = require('tilelive');
var path = require('path');
var http = require("http");
var url = require('url');
var fs = require("fs");
var qs = require('querystring');
var styleConv = require('./style-conv');
require('tilelive-bridge').registerProtocols(tilelive);

var port = 8080;
var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

if (args.length < 1) {
	console.error('Usage: tile-serve [-s <json style file>] <mapnik xlm file>');
	process.exit(1);
}
if (args[0] == '-s') { // Use an existing style
	var styleFile = path.resolve(__dirname, args[1]);
	args.splice(0, 2);
	var mapFile = path.resolve(__dirname, args[0]);
	fs.readFile(styleFile, 'utf8', function(err, data) {
		startServing(mapFile, data);
	});
} else {
	var mapFile = path.resolve(__dirname, args[0]);
	styleConv.convertStyle(mapFile, 'http://localhost:8080/map?z={z}&x={x}&y={y}', function(jsonStyle) {
		startServing(mapFile, jsonStyle);
	});
}

function startServing(mapFile, style) {
	tilelive.load("bridge://" + mapFile, function(err, source) {
		if (err)
			throw err;
		serveTilesSource(source, style);
	});
}

function serveTilesSource(source, style) {
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
			serveStyle(response, style);
		} else if (parsedUrl.pathname == '/favicon.ico') {
			// Ignored
			response.writeHead(404);
			response.end();
		} else if (parsedUrl.pathname == '/font') {
			serveFont(response, parsedUrl);
		} else {
			// Serve a tile
			var query = parsedUrl.query;
			var params = qs.parse(query);
			console.log('Requested z=' + params.z + ', x=' + params.x + ', y=' + params.y);
			loadFromCache(params.z, params.x, params.y, function(cachedTile) {
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
				source.getTile(params.z, params.x, params.y, function(err, tile, headers) {
					if (err) {
						response.writeHead(404);
						response.end();
						console.error(err);
						return;
					}
					writeToCache(params.z, params.x, params.y, tile, function() {
						// Return response after saving to cache
						response.writeHead(200, 'OK', headers);
						response.write(tile, 'binary');
						response.end();
					});
				});
			});
		}
	}).listen(port);
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

function loadFromCache(z, x, y, hit, miss) {
	var fileName = path.resolve(__dirname, 'cache/' + z + '-' + x + '-' + y + '.pbf');
	fs.readFile(fileName, 'binary', function(err, file) {
		if (err) {
			miss();
		} else {
			hit(file);
		}
	});
}

function writeToCache(z, x, y, tile, callback) {
	var fileName = path.resolve(__dirname, 'cache/' + z + '-' + x + '-' + y + '.pbf');
	fs.writeFile(fileName, tile, 'binary', callback);
}

function serveStyle(response, style) {
	response.writeHead(200);
	response.write(style, 'utf8');
	response.end();
}

function serveMapPage(response) {
	fs.readFile(path.resolve(__dirname, 'index.html'), 'utf8', function(err, file) {
		if (err)
			throw err;
		response.writeHead(200);
		response.write(file, 'utf8');
		response.end();
	});
}
