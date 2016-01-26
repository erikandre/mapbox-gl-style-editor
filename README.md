# style-conv

An experimental tool for converting Mapnik XML styles to [Mapbox GL Styles](https://www.mapbox.com/mapbox-gl-style-spec/).

## Usage

```
./style-conv.js <Mapnik xml file> <output file> <tile URL>
```

Where the tile URL is a local or remote URL specifying the location of the vector tiles data (e.g http://localhost:8080/map?z={z}&x={x}&y={y})

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

# tile-serve

An experimental map server. Not meant for production use but for working with maps locally without having to generate all the vector tiles beforehand.

## Usage
```
./tile-serve.js [-s <json style file>] <Mapnik xml file>
```

Where -s <json style file> can be used to serve an existing Mapbox GL Style file. If no style is specified one will be generated based on the XML style data from the Mapnik XML file.

# Dependencies

* [Tilelive](https://github.com/mapbox/tilelive)
* [Tilelive-bridge](https://github.com/mapbox/tilelive-bridge)
