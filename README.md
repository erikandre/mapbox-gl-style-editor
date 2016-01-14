# tile-conv
A command line tool for converting Mapnik xml + sources to Mapbox Vector tiles.

## Usage
```
./tile-conv.js <Mapnik xml file> [-r] [-p <prefix>] <z> <x> <y>
```
Where z, x and y are the tiles coordinates in the Google Maps XYZ coordinate system (See [http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/](http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/) for an explanation).

* -r: Recursive mode
* -c: Enable gzip compression
* -p <prefix>: Define prefix for output files

# tile-serve

An experimental map server. Not meant for production use but for working with maps locally without having to generate all the vector tiles beforehand.

## Usage
```
./tile-serve.js <Mapnik xml file>
```

# Project Roadmap

* ~~Recursive export of tiles at higher zoom level~~ (Done)
* Define tile coordinate ranges
* ~~File output prefixes~~
* Export to single .mbtiles file
* Generate Mapbox gl styles based on Mapnik XML styles

# Dependencies

* [Tilelive](https://github.com/mapbox/tilelive)
* [Tilelive-bridge](https://github.com/mapbox/tilelive-bridge)
