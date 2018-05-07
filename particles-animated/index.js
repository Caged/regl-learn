const regl = require("regl")(document.body);
const d3 = require("d3");

const numPoints = 10000;

// dimensions of the viewport we are drawing in
const width = window.innerWidth;
const height = window.innerHeight;

// random number generator from d3-random
const rng = d3.randomNormal(0, 0.1);
const rngv = d3.randomNormal(0.0001, 0.001);

// create initial set of points
let points = d3.range(numPoints).map(i => ({
  x: rng(),
  y: rng(),
  xv: rngv(),
  yv: rngv()
}));

const drawPoints = regl({
  frag: `
    precision mediump float;

    void main() {
      float r = 0.0, delta = 0.0, alpha = 1.0;
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      r = dot(cxy, cxy);
      if (r > 1.0) {
          discard;
      }
      gl_FragColor = vec4(0, 1, 0, 1) * alpha;
    }
  `,
  vert: `
    precision mediump float;
    attribute vec2 position;

    void main() {
      gl_PointSize = 9.0;
      gl_Position = vec4(position, 0, 1);
    }
  `,

  attributes: {
    position: (ctx, props) => props.points.map(p => [p.x, p.y])
  },

  uniforms: {},

  // specify the number of points to draw
  count: points.length,

  // specify that each vertex is a point (not part of a mesh)
  primitive: "points"
});

regl.frame(({ tick }) => {
  points.forEach(d => {
    if (d.x >= 1 || d.x <= -1) d.xv = -d.xv;
    if (d.y >= 1 || d.y <= -1) d.yv = -d.yv;

    d.x += d.xv;
    d.y += d.yv;
  });

  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1
  });

  drawPoints({ points });
});

// regl.clear({
//   color: [0, 0, 0, 1],
//   depth: 1
// });
//
// drawPoints({ points });