#!/usr/bin/env node

var tilelive = require('tilelive');
var path = require('path');
var http = require("http");
var url = require('url');
var fs = require("fs");
var qs = require('querystring');
require('tilelive-bridge').registerProtocols(tilelive);

var port = 8080;
var args = process.argv;
args.splice(0, 2); // Remove 'node' and the name of the script

if (args.length < 1) {
  console.error('Usage: tile-serve <mapnik xlm file>');
  process.exit(1);
}
var mapFile = path.resolve(__dirname, args[0]);
tilelive.load("bridge://" + mapFile, function(err, source) {
    if (err) throw err;
    serveTilesSource(source);
});

function serveTilesSource(source) {
  console.log('Serving tiles from ' + mapFile + " at port " + port);
  http.createServer(function(request, response) {
    // Parse request to get tile coordinates
    console.log('Raw URL: ' + request.url);
    var parsedUrl = url.parse(request.url);
    if (parsedUrl.pathname == '/') {
      // Serve the main html page
      serveMapPage(response);
    }
    else if (parsedUrl.pathname == '/style.json') {
      // Serve the map style
      serveStyle(response);
    }
    else if (parsedUrl.pathname == '/favicon.ico') {
      // Ignored
      response.writeHead(404);
      response.end();
    }
    else {
      // Serve a tile
      var query = parsedUrl.query;
      var params = qs.parse(query);
      console.log('Requested z=' + params.z + ', x=' + params.x + ', y=' + params.y);
      source.getTile(params.z, params.x, params.y, function(err, tile, headers) {
        if (err) {
          response.writeHead(404);
          response.end();
          console.error(err);
          return;
        }
        response.writeHead(200, 'OK', headers);
        response.write(tile, 'binary');
        response.end();
      });
    }
  }).listen(port);
}

function serveStyle(response) {
  fs.readFile(path.resolve(__dirname, 'style.json'), 'utf8', function(err, file) {
    if (err) throw err;
    response.writeHead(200);
    response.write(file, 'utf8');
    response.end();
  });
}

function serveMapPage(response) {
  fs.readFile(path.resolve(__dirname, 'index.html'), 'utf8', function(err, file) {
    if (err) throw err;
    response.writeHead(200);
    response.write(file, 'utf8');
    response.end();
  });
}
