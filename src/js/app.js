(function () {
  var config = {
    model: 'fastGnpRandomGraph',
    n: 40,
    p: 0.05,
    minRadius: 0.75,
    maxRadius: 4,
    fenceRadius: 1.2,
    radiusDistribution: 1.5,
    symbolDistribution: 2,
    fenceDistribution: 4,
    collisionEnabled: true,
    collisionRadius: 3,
    manyBodyEnabled: false,
    manyBodyStrength: -200,
    'Stop simulation': function () {
      simulation.stop();
    },
    'Restart simulation': function () {
      simulation.restart();
    },
    'Regenerate graph': function () {
      foo();
    },
    'Save SVG': function () {
      d3_save_svg.save(svg.node(), {
        filename: 'sylvester'
      });
    }
  };

  var previousConfig = _.clone(config);

  var symbols = {};
  _.forEach(['circle', 'logo'], function (key) {
    symbols[key] = d3.select('#' + key + ' > svg');
  });

  var svg = d3.select('svg.stage');
  var width = +svg.attr('width');
  var height = +svg.attr('height');

  // @todo Improve var naming
  var w = 512;
  var s = 8 / w;

  var graph;
  var simulation;

  var gui = new dat.GUI();

  gui.remember(config);

  var f1 = gui.addFolder('Graph');

  f1.add(config, 'model', {
    'G(n, p)': 'gnpRandomGraph',
    'G(n, p) (fast)': 'fastGnpRandomGraph'
  }).onChange(function (nextValue) {
    if (previousConfig.model !== nextValue) {
      previousConfig.model = nextValue;
      foo();
    }
  });

  f1.add(config, 'n', 5, 100).step(1).onChange(function (nextValue) {
    if (previousConfig.n !== nextValue) {
      previousConfig.n = nextValue;
      foo();
    }
  });

  f1.add(config, 'p', 0, 1).step(0.01).onChange(function (nextValue) {
    if (previousConfig.p !== nextValue) {
      previousConfig.p = nextValue;
      foo();
    }
  });

  f1.add(config, 'minRadius', 0.05, 5).step(0.05).onChange(function (nextValue) {
    if (previousConfig.minRadius !== nextValue) {
      previousConfig.minRadius = nextValue;
      foo();
    }
  });

  f1.add(config, 'maxRadius', 0.05, 5).step(0.05).onChange(function (nextValue) {
    if (previousConfig.maxRadius !== nextValue) {
      previousConfig.maxRadius = nextValue;
      foo();
    }
  });

  f1.add(config, 'radiusDistribution', 0.1, 3).step(0.1).onChange(function (nextValue) {
    if (previousConfig.radiusDistribution !== nextValue) {
      previousConfig.radiusDistribution = nextValue;
      foo();
    }
  });

  f1.add(config, 'fenceRadius', 1, 2).step(0.1).onChange(function (nextValue) {
    if (previousConfig.fenceRadius !== nextValue) {
      previousConfig.fenceRadius = nextValue;
      foo();
    }
  });

  f1.add(config, 'fenceDistribution', 0.1, 6).step(0.1).onChange(function (nextValue) {
    if (previousConfig.fenceDistribution !== nextValue) {
      previousConfig.fenceDistribution = nextValue;
      foo();
    }
  });

  f1.add(config, 'symbolDistribution', 0.1, 6).step(0.1).onChange(function (nextValue) {
    if (previousConfig.symbolDistribution !== nextValue) {
      previousConfig.symbolDistribution = nextValue;
      foo();
    }
  });

  f1.open();

  var f2 = gui.addFolder('Forces');

  f2.add(config, 'collisionEnabled').onChange(function (nextValue) {
    if (previousConfig.collisionEnabled !== nextValue) {
      previousConfig.collisionEnabled = nextValue;
      setCollisionForce();
      simulation.stop().alphaTarget(0.3).restart();
    }
  });

  f2.add(config, 'collisionRadius', 1, 4).step(0.1).onChange(function (nextValue) {
    if (previousConfig.collisionRadius !== nextValue) {
      previousConfig.collisionRadius = nextValue;
      setCollisionForce();
      simulation.stop().alphaTarget(0.3).restart();
    }
  });

  f2.add(config, 'manyBodyEnabled').onChange(function (nextValue) {
    if (previousConfig.manyBodyEnabled !== nextValue) {
      previousConfig.manyBodyEnabled = nextValue;
      setManyBodyForce();
      simulation.stop().alphaTarget(0.3).restart();
    }
  });

  f2.add(config, 'manyBodyStrength', -500, 0).step(1).onChange(function (nextValue) {
    if (previousConfig.manyBodyStrength !== nextValue) {
      previousConfig.manyBodyStrength = nextValue;
      setManyBodyForce();
      simulation.stop().alphaTarget(0.3).restart();
    }
  });

  f2.open();

  gui.add(config, 'Stop simulation');
  gui.add(config, 'Restart simulation');
  gui.add(config, 'Regenerate graph');
  gui.add(config, 'Save SVG');

  function generateGnpGraph(type, n, p) {
    var G = jsnx[type](n, p);

    var graph = {
      nodes: _.map(G.nodes(), function (node) {
        return {
          id: node,
          links: 0,
          scale: 0
        };
      }),
      links: _.map(G.edges(), function (edge) {
        return {
          source: edge[0],
          target: edge[1]
        };
      })
    };

    _.forEach(graph.links, function (link) {
      graph.nodes[link.source].links++;
      graph.nodes[link.target].links++;
    });

    var minLinks = _.minBy(graph.nodes, function (o) {
      return o.links;
    }).links;

    var maxLinks = _.maxBy(graph.nodes, function (o) {
      return o.links;
    }).links;

    var size = d3.scalePow()
      .exponent(config.radiusDistribution)
      .domain([minLinks + 1, maxLinks + 1])
      .range([config.minRadius, config.maxRadius]);

    var symbol = d3.scalePow()
      .exponent(config.symbolDistribution)
      .domain([minLinks + 1, maxLinks + 1])
      .range([0, 1]);

    var hasFence = d3.scalePow()
      .exponent(config.fenceDistribution)
      .domain([minLinks + 1, maxLinks + 1])
      .range([0, 1]);

    _.forEach(graph.nodes, function (node) {
      node.scale = size(node.links + 1);
      node.symbol = Math.round(symbol(node.links + 1)) ? 'logo' : 'circle';
      node.hasFence = Math.round(hasFence(node.links + 1)) ? true : false;
    });

    return graph;
  }

  function buildSimulation(graph) {
    svg.selectAll('*').remove();

    var zoom = d3.zoom()
      .scaleExtent([1, 1])
      .on('zoom', zoomed);

    simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(function (d) {
        return d.id;
      }))
      .force('center', d3.forceCenter(width / 2, height / 2));

    if (config.collisionEnabled) {
      setCollisionForce();
    }
    if (config.manyBodyEnabled) {
      setManyBodyForce();
    }

    svg.call(zoom);

    var container = svg.append('g');

    var link = container.append('g')
      .selectAll('line')
      .data(graph.links)
      .enter().append('line')
      .attr('stroke', '#FFF')
      .attr('stroke-width', 1)

    var node = container.append('g')
      .selectAll('circle')
      .data(graph.nodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('g')
      .each(function (d) {
        var self = this;
        symbols[d.symbol].selectAll('*')
          .each(function () {
            self.appendChild(this.cloneNode(true))
          });
      })
      // .attr('fill', '#FFF')
      .attr('transform', function (d) {
        return 'scale(' + (s * d.scale) + ')';
      });

    node.append('circle')
      .attr('cx', function (d) {
        return w * s * d.scale / 2;
      })
      .attr('cy', function (d) {
        return w * s * d.scale / 2;
      })
      .attr('r', function (d) {
        return w * s * d.scale * config.fenceRadius;
      })
      .attr('fill', 'none')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 1)
      .attr('stroke', '#FFF')
      .attr('display', function (d) {
        if (!d.hasFence) {
          return 'none';
        }
      });

    // node.append('title')
    //   .text(function (d) {
    //     return d.id;
    //   });

    simulation
      .nodes(graph.nodes)
      .on('tick', ticked);

    simulation.force('link')
      .links(graph.links);

    function ticked() {
      link
        .attr('x1', function (d) {
          return d.source.x;
        })
        .attr('y1', function (d) {
          return d.source.y;
        })
        .attr('x2', function (d) {
          return d.target.x;
        })
        .attr('y2', function (d) {
          return d.target.y;
        });

      node.attr('transform', function (d) {
        var offset = w * s * d.scale / 2;
        return 'translate(' + (d.x - offset) + ',' + (d.y - offset) + ')';
      });
    }

    function zoomed() {
      var transform = d3.event.transform;
      container.attr('transform', 'translate(' + transform.x + ',' + transform.y + ')');
    }

    function dragstarted(d) {
      if (!d3.event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) {
        simulation.alphaTarget(0);
      }
      d.fx = null;
      d.fy = null;
    }
  }

  function setCollisionForce() {
    simulation.force('collide', config.collisionEnabled ? d3.forceCollide().radius(function (d) {
      return w * s * d.scale / 2 * config.collisionRadius;
    }) : _.noop);
  }

  function setManyBodyForce() {
    simulation.force('charge', config.manyBodyEnabled ? d3.forceManyBody().strength(config.manyBodyStrength) : _.noop);
  }

  function foo() {
    graph = generateGnpGraph(config.model, config.n, config.p);
    buildSimulation(graph);
  }

  foo();
})();
