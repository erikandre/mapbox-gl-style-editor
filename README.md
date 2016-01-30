# style-conv

An experimental tool for converting Mapnik XML styles to [Mapbox GL Styles](https://www.mapbox.com/mapbox-gl-style-spec/).

## Usage

```
./style-conv.js <Mapnik xml file> <output file> <tile URL>
```

Where the tile URL is a local or remote URL specifying the location of the vector tiles data (e.g http://localhost:8080/map?z={z}&x={x}&y={y})

# style-editor

A simple editor for Mapbox gl styles. Allows you to open an style file and edit the raw json data and see how the changes affects the map. Useful if you have exported a style from Mapbox Studio and want to edit it.

## Usage

Edit a Mapbox gl json style (all tile data needs to be already converted to vector tiles)
```
./tile-serve.js <json style file>
```

Convert a Mapnik XML based style to a Mapbox gl style and edit it (some manual modifications are needed). By default this will used vector tile data that is generated on the fly using the obsolete tilelive-bridge method (see comments below for tile-conv).
```
./tile-serve.js <Mapnik xml file>
```


# tile-conv

**DEPRECATED: This tool does not rengerate optimized vector tiles, please use the official [mapbox-tile-copy](https://github.com/mapbox/mapbox-tile-copy) tool instead.**

A command line tool for converting Mapnik xml + sources to Mapbox Vector tiles.

## Usage
```
./tile-conv.js <Mapnik xml file> [-r] [-p <prefix>] <z> <x> <y>
```
Where z, x and y are the tiles coordinates in the Google Maps XYZ coordinate system (See [http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/](http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/) for an explanation).

* -r: Recursive mode
* -c: Enable gzip compression
* -p <prefix>: Define prefix for output files

# Dependencies

* [Tilelive](https://github.com/mapbox/tilelive)
* [Tilelive-bridge](https://github.com/mapbox/tilelive-bridge)
