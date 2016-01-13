# tile-conv
A command line tool for converting Mapnik xml + sources to Mapbox Vector tiles.

## Usage
```
./index.js <Mapnik xml file> [-r] <z> <x> <y>
```
Where z, x and y are the tiles coordinates in the Google Maps XYZ coordinate system (See [http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/](http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/) for an explanation).
-r enables recursive tile generation (down to zoom level 14)

## Project Roadmap

* ~~Recursive export of tiles at higher zoom level~~ (Done)
* Define tile coordinate ranges
* File output prefixes
* Export to single .mbtiles file

## Dependencies

* [Tilelive](https://github.com/mapbox/tilelive)
* [Tilelive-bridge](https://github.com/mapbox/tilelive-bridge)
