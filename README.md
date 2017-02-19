# sylvester

## Installation

### Ubuntu

```
sudo apt-get install graphicsmagick pngquant
yarn install
```

### OS X

```
brew install graphicsmagick
brew install pngquant
yarn install
```

## Usage

To generate SVG of random graph, run:

```
gulp livereload
```

To prepare generated SVG for web, copy SVG file to `/process` and run:

```
gulp process
```

## Further reading

* [Force-directed graph drawing](https://en.wikipedia.org/wiki/Force-directed_graph_drawing)
* [Erdős–Rényi model](https://en.wikipedia.org/wiki/Erd%C5%91s%E2%80%93R%C3%A9nyi_model)

## Feature ideas

* [Centrality - Elijah Meeks](http://bl.ocks.org/emeeks/9357371)
* [Sticky Force Layout - Mike Bostock](https://bl.ocks.org/mbostock/3750558)
* [Modifying a Force Layout - Mike Bostock](https://bl.ocks.org/mbostock/1095795)

## Credit

* [Force-Directed Graph - Mike Bostock](https://bl.ocks.org/mbostock/4062045) (GNU General Public License, version 3)
* [Collision Detection - Mike Bostock](https://bl.ocks.org/mbostock/31ce330646fa8bcb7289ff3b97aab3f5) (GNU General Public License, version 3)
* `/src/svg/logo.svg` - (c) Siyavula Education (All rights reserved)

## License

Copyright (c) 2017 Hein Bekker. Licensed under the GNU Affero General Public License, version 3.
