# style-editor

A simple editor for Mapbox gl styles. Allows you to open an style file and edit the raw json data and see how the changes affects the map. Useful if you have exported a style from Mapbox Studio and want to edit it.

## Usage

Edit a Mapbox gl json style. All tile data references by the style must already have been converted to vector tiles.
This can be done using [mapbox-tile-copy](https://github.com/mapbox/mapbox-tile-copy).
```
./style-editor.js <json style file>
```

# style-conv

An experimental tool for converting Mapnik XML styles to [Mapbox GL Styles](https://www.mapbox.com/mapbox-gl-style-spec/).

## Usage

```
./style-conv.js <Mapnik xml file> <output file> <tile URL>
```

Where the tile URL is a local or remote URL specifying the location of the vector tiles data (e.g http://localhost:8080/map?z={z}&x={x}&y={y})

# Dependencies

* [Tilelive](https://github.com/mapbox/tilelive)
* [Tilelive-bridge](https://github.com/mapbox/tilelive-bridge)
