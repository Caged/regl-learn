const regl = require('regl')({
  container: document.body
})
const d3 = require('d3')

// How many points to draw
const numPoints = 50000

// Size of vertex data in bytes (4.0 is GL_FLOAT size)
const vertSize = 4 * 11

// The current number of points
let pointCount = 0

// point increment
const pointIncrement = 10

// chunk counter
let chunk = 0
const totalChunks = numPoints / pointIncrement

// random number generator for position
const rng = d3.randomNormal(0.001, 0.1)

// random number generator for velocity
const rngv = d3.randomNormal(0.1, 0.5)

// Allocate a dynamic buffer that can store
// our points
const points = regl.buffer({
  usage: 'dynamic',
  type: 'float',
  length: vertSize * numPoints
})

const drawPoints = regl({
  depth: {enable: false},
  stencil: {enable: false},
  frag: `
    precision mediump float;
    varying vec4 fill;

    void main() {
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;

      gl_FragColor = vec4(fill);
    }
  `,
  vert: `
    precision mediump float;
    attribute vec2 position;
    attribute vec2 endpos;
    attribute vec2 velocity;
    attribute float birth;
    attribute vec4 color;
    uniform float tick;
    uniform float time;
    varying vec4 fill;


    void main() {
      vec2 d = endpos - position;
      // vec2 newpos = (position + d + velocity) * (tick / birth);

      // Works with consitent velocity towards endpos
      // vec2 newpos = (position + d) * (time - birth);

      // Works with consitent velocity towards endpos
      vec2 newpos = position + (d * ((time - birth) / abs(velocity.x)));

      // If we've made it to the x position, skip drawing the point
      gl_PointSize = newpos.x > endpos.x ? 0.0 : 10.0;

      gl_Position = vec4(newpos, 0, 1);
      fill = color;
    }
  `,

  attributes: {
    position: {
      buffer: points,
      stride: vertSize,
      offset: 0
    },

    endpos: {
      buffer: points,
      stride: vertSize,
      offset: 8
    },

    velocity: {
      buffer: points,
      stride: vertSize,
      offset: 16
    },

    birth: {
      buffer: points,
      stride: vertSize,
      offset: 24
    },

    color: {
      buffer: points,
      stride: vertSize,
      offset: 28
    }
  },

  uniforms: {
    tick: regl.context('tick'),
    time: regl.context('time')
  },

  // specify the number of points to draw
  count: () => {
    return pointCount + pointIncrement
  },

  // specify that each vertex is a point (not part of a mesh)
  primitive: 'points'
})

function makePoint(time) {
  if (pointCount < numPoints) {
    // Add vertext data as subdata
    const newPoints = Array(pointIncrement)
      .fill()
      .map(() => {
        const {r, g, b} = d3.hsl(Math.random() * 60, 1, Math.max(0.2, Math.random() * 1)).rgb()
        return [
          rng(), // x
          rng(), // y

          1.0, // endx
          0.0, // endy

          rngv(), // x velocity
          rngv(), // y velocity

          time, // birth time particle was born

          r / 255, // red
          g / 255, // green
          b / 255, // blue
          1.0 // alpha
        ]
      })

    // We are contiously streaming in new data, but we don't want to have a buffer with unbounded
    // growth.  What we're doing here is updating the buffer subdata in chunks and starting over
    // at byte offset 0 when the totalChunks limit has been hit.
    //
    // This makes the assumption that by the time we get to the end of the buffer, the data at the
    // beginning of the buffer is ok to be replaced.  Put another way, by the time we animate in
    // the last point, we assume the first points are "done" or have reached their destination and
    // are ready to be replaced.
    //
    // This nice thing about this approach is that it allows us to replace data at the beginning of
    // the buffer without having to store the data and itterate over every point during every tick
    // to do some check.
    if (chunk >= totalChunks) chunk = 0
    points.subdata(newPoints, chunk * pointIncrement * vertSize)

    if (pointCount + pointIncrement < numPoints) {
      pointCount = chunk * pointIncrement
    }
    chunk += 1
  }
}

makePoint(0)
regl.frame(({time, tick}) => {
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1
  })

  drawPoints({points})

  // Every 60 frames (about 1 second), generate new points
  if (tick % 60 === 0) {
    makePoint(time)
  }
})
