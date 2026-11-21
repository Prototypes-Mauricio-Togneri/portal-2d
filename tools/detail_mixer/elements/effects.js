// ============================================================
// Element detail: every layer drawn over the ten sprites.
// Each instance's look is chosen from one seed, its thing and
// its number (never a box's tile), and drawn in the sprite's
// own 256 px frame, so it is the same look at any tile size.
// ============================================================

const Engine = window.ChamberEngine
const MID = 128 // The middle of a sprite's 256 px tile
const WAY_ANGLE = {UP: 0, RIGHT: Math.PI / 2, DOWN: Math.PI, LEFT: -Math.PI / 2}
const CARRIED_BOX_AHEAD = 0.26 // How far ahead of the tile's middle the subject holds a box, in tiles (src/game/renderer.ts)
const CARRIED_BOX_SIZE = 0.7 // The held box's sprite side, in tiles (src/game/renderer.ts)

// ---------- Numbers ----------

/** A number from 0 to 1 that depends only on the seed, two whole numbers and a salt. */
function hash(seed, a, b, salt) {
  let h = Math.imul(seed | 0, 0x9E3779B1) ^ Math.imul(a | 0, 0x85EBCA77) ^ Math.imul(b | 0, 0xC2B2AE3D) ^ Math.imul(salt | 0, 0x27D4EB2F)
  h ^= h >>> 15
  h = Math.imul(h, 0x2C1B3C6D)
  h ^= h >>> 12
  h = Math.imul(h, 0x297A2D39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** A stream of numbers from 0 to 1. */
function randomFrom(seed, a, b, salt) {
  let state = Math.floor(hash(seed, a, b, salt) * 4294967296) >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function smooth(from, to, value) {
  const t = clamp01((value - from) / (to - from))
  return t * t * (3 - (2 * t))
}

function valueNoise(seed, x, y, salt) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const u = fx * fx * (3 - (2 * fx))
  const v = fy * fy * (3 - (2 * fy))
  const a = hash(seed, xi, yi, salt)
  const b = hash(seed, xi + 1, yi, salt)
  const c = hash(seed, xi, yi + 1, salt)
  const d = hash(seed, xi + 1, yi + 1, salt)
  return a + ((b - a) * u) + ((c - a) * v) + ((a - b - c + d) * u * v)
}

/** Cloudy noise from 0 to 1, stretched so it uses the whole range. */
function clouds(seed, x, y, salt) {
  const raw = (valueNoise(seed, x, y, salt) * 0.6) + (valueNoise(seed, (x * 2.1) + 7.3, (y * 2.1) + 3.1, salt + 1) * 0.28) + (valueNoise(seed, (x * 4.3) + 1.7, (y * 4.3) + 9.2, salt + 2) * 0.12)
  return clamp01(((raw - 0.5) * 2.3) + 0.5)
}

function rgba(colour, alpha) {
  return `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${clamp01(alpha).toFixed(3)})`
}

/** A signed share from -1 to 1, spread so most instances land clearly off the middle. */
function spread(random) {
  const value = (random() * 2) - 1
  return Math.sign(value) * Math.pow(Math.abs(value), 0.7)
}

// ---------- Geometry, in the sprite's own 256 px frame ----------

/** A point turned some quarter turns clockwise about the tile's middle. */
function turned(point, quarters) {
  let dx = point[0] - MID
  let dy = point[1] - MID

  for (let i = 0; i < quarters; i++) {
    [dx, dy] = [-dy, dx]
  }

  return [MID + dx, MID + dy]
}

function addPolygon(path, points) {
  points.forEach((point, i) => (i === 0) ? path.moveTo(point[0], point[1]) : path.lineTo(point[0], point[1]))
  path.closePath()
}

function rectPoints(left, top, right, bottom) {
  return [[left, top], [right, top], [right, bottom], [left, bottom]]
}

function addFourWays(path, points) {
  for (let q = 0; q < 4; q++) {
    addPolygon(path, points.map((point) => turned(point, q)))
  }
}

function addCircle(path, radius, anticlockwise = false) {
  path.moveTo(MID + radius, MID)
  path.arc(MID, MID, radius, 0, Math.PI * 2, anticlockwise)
}

function memo(make) {
  let value = null
  return () => value ?? (value = make())
}

// The box (box.svg, scaled 0.8): four corner blocks with their inner corner cut, four tabs, four bars, a centre disc
const BOX_BLOCK = [[58.4, 58.4], [103.5, 58.4], [103.5, 82.4], [82.4, 103.5], [58.4, 103.5]]
const BOX_TAB = rectPoints(115.0, 58.4, 141.0, 78.2)
const BOX_DISC = 29.7
const BOX_CORE = rectPoints(61.4, 61.4, 194.6, 194.6)

const PATHS = {
  boxBlocks: memo(() => { const path = new Path2D(); addFourWays(path, BOX_BLOCK); return path }),
  boxTabs: memo(() => { const path = new Path2D(); addFourWays(path, BOX_TAB); return path }),
  boxDisc: memo(() => { const path = new Path2D(); addCircle(path, BOX_DISC); return path }),
  boxPlates: memo(() => { const path = new Path2D(); addFourWays(path, BOX_BLOCK); addFourWays(path, BOX_TAB); addCircle(path, BOX_DISC); return path }),
  mirrorPlates: memo(() => { const path = new Path2D(); addFourWays(path, BOX_BLOCK); addFourWays(path, BOX_TAB); return path }),
  boxCore: memo(() => { const path = new Path2D(); addPolygon(path, BOX_CORE); return path }),
  // The mirror's frame, a little grown, and its glass and glint (box_mirror.svg)
  mirrorFrame: memo(() => mirrorRect(62.6, 12.2)),
  mirrorGlass: memo(() => mirrorRect(57.6, 7.2)),
  mirrorGlint: memo(() => mirrorRect(55.5, 2.2, -0.8)),
  // The button and switch (140-unit grid, scaled 256/140 and 0.85): plate, dome, clamps
  buttonDome: memo(() => { const path = new Path2D(); addCircle(path, 75.6); return path }),
  buttonDomeOnly: memo(() => { const path = new Path2D(); addCircle(path, 68.4); return path }),
  buttonPlateRing: memo(() => { const path = new Path2D(); addCircle(path, 103.2); addCircle(path, 74.9, true); return path }),
  buttonNotClamps: memo(() => { const path = new Path2D(); addPolygon(path, rectPoints(-10, -10, 266, 266)); BUTTON_CLAMPS.forEach((clamp) => addPolygon(path, clamp)); return path }),
  buttonClamps: memo(() => { const path = new Path2D(); BUTTON_CLAMPS.forEach((clamp) => addPolygon(path, clamp)); return path }),
  // The clamps alternate in winding: each is turned to wind as the outer circle does, so the nonzero rule keeps it whole
  buttonNeutral: memo(() => { const path = new Path2D(); addCircle(path, 110); addCircle(path, 74.9, true); BUTTON_CLAMPS.forEach((clamp, i) => addPolygon(path, (i % 2 === 0) ? [...clamp].reverse() : clamp)); return path }),
  // The turntable: the disc's face inside its lit lip, and the cut round it
  discFace: memo(() => { const path = new Path2D(); addCircle(path, 91.8); return path }),
  // The grate (ditch_bridged.svg): frame, bars, slots
  grateFrame: memo(() => { const path = new Path2D(); addPolygon(path, rectPoints(12, 12, 244, 244)); addPolygon(path, rectPoints(26, 26, 230, 230).reverse()); return path }),
  grateFace: memo(() => { const path = new Path2D(); addPolygon(path, rectPoints(12, 12, 244, 244)); GRATE_SLOTS.forEach((slot) => path.roundRect(slot[0], slot[1], 23, 23, 5)); return path }),
  grateBars: memo(() => { const path = new Path2D(); addPolygon(path, rectPoints(26, 26, 230, 230)); GRATE_SLOTS.forEach((slot) => path.roundRect(slot[0], slot[1], 23, 23, 5)); return path }),
  // The chevrons' outlines (arrow.svg, turntable_arrow.svg)
  arrowPaint: memo(() => { const path = new Path2D(); addPolygon(path, ARROW_OUTLINE); return path }),
  chevronPaint: memo(() => { const path = new Path2D(); addPolygon(path, CHEVRON_OUTLINE); return path }),
}

/** A rectangle along the mirror's diagonal, bottom left to top right, half as long and half as wide as given, shifted across it. */
function mirrorRect(halfLength, halfWidth, across = 0) {
  const along = [Math.SQRT1_2, -Math.SQRT1_2]
  const normal = [Math.SQRT1_2, Math.SQRT1_2]
  const centre = [MID + (normal[0] * across), MID + (normal[1] * across)]
  const corner = (s, t) => [centre[0] + (along[0] * s * halfLength) + (normal[0] * t * halfWidth), centre[1] + (along[1] * s * halfLength) + (normal[1] * t * halfWidth)]
  const path = new Path2D()
  addPolygon(path, [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)])
  return path
}

const BUTTON_CLAMPS = [
  [[51.2, 83.8], [85.9, 47.7], [43.9, 21.4], [21.5, 43.0]],
  [[204.6, 83.3], [169.9, 47.2], [211.9, 20.9], [234.3, 42.5]],
  [[204.7, 172.6], [170.0, 208.6], [212.0, 234.9], [234.5, 213.4]],
  [[51.0, 172.4], [85.7, 208.5], [43.7, 234.8], [21.3, 213.2]],
]

const GRATE_SLOTS = []
for (let j = 0; j < 6; j++) {
  for (let i = 0; i < 6; i++) {
    GRATE_SLOTS.push([35 + (32 * i), 35 + (32 * j)])
  }
}

const ARROW_OUTLINE = [[51.2, 151.2], [128, 81.4], [204.8, 151.2], [183.2, 174.8], [128, 124.6], [72.8, 174.8]]
const CHEVRON_OUTLINE = [[62.8, 147.7], [128, 88.4], [193.2, 147.7], [175.0, 167.8], [128, 125.1], [81.0, 167.8]]

const TEST = document.createElement('canvas').getContext('2d') // Asks whether a point lies in a path, with no transform

function inside(path, x, y, rule = 'nonzero') {
  return TEST.isPointInPath(path, x, y, rule)
}

// ---------- Marks, drawn in the sprite's frame; px is one screen pixel there ----------

/** A thin line, faint at both ends, with a lit edge one pixel beside it when given. */
function scratch(ctx, px, x, y, length, angle, cut, edge, width = 1) {
  const dx = Math.cos(angle) * length / 2
  const dy = Math.sin(angle) * length / 2
  const nx = -Math.sin(angle) * px
  const ny = Math.cos(angle) * px

  ctx.lineCap = 'butt'
  ctx.lineWidth = px * width

  for (const [colour, sx, sy] of (edge === null) ? [[cut, 0, 0]] : [[edge, nx, ny], [cut, 0, 0]]) {
    const fade = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy)
    fade.addColorStop(0, rgba(colour, 0))
    fade.addColorStop(0.25, rgba(colour, colour[3]))
    fade.addColorStop(0.7, rgba(colour, colour[3]))
    fade.addColorStop(1, rgba(colour, 0))
    ctx.strokeStyle = fade
    ctx.beginPath()
    ctx.moveTo(x - dx + sx, y - dy + sy)
    ctx.lineTo(x + dx + sx, y + dy + sy)
    ctx.stroke()
  }
}

/** A small rough shape about a point: a knock, a flake, a bit of grit. */
function roughBlob(ctx, random, x, y, radius, corners = 6) {
  ctx.beginPath()

  for (let i = 0; i < corners; i++) {
    const angle = ((i + (random() * 0.6)) / corners) * Math.PI * 2
    const reach = radius * (0.55 + (0.45 * random()))
    const px = x + (Math.cos(angle) * reach)
    const py = y + (Math.sin(angle) * reach)
    if (i === 0) {
      ctx.moveTo(px, py)
    } else {
      ctx.lineTo(px, py)
    }
  }

  ctx.closePath()
}

function fillAll(ctx, colour, alpha) {
  ctx.fillStyle = rgba(colour, alpha)
  ctx.fillRect(-20, -20, 296, 296)
}

/** Each instance's own tone: lighter or darker, and warmer or cooler. */
function drawTone(ctx, random, a, shade, tint) {
  const light = spread(random)
  const warm = spread(random)

  fillAll(ctx, (light > 0) ? [255, 255, 255] : [0, 0, 0], Math.abs(light) * shade * a * ((light > 0) ? 0.8 : 1))

  if (tint > 0) {
    fillAll(ctx, (warm > 0) ? [255, 186, 110] : [110, 150, 255], Math.abs(warm) * tint * a)
  }
}

/** The floor's room light at the instance's tile: darker beside a wall, lifted in the open. */
function drawLight(ctx, a, info) {
  fillAll(ctx, [20, 26, 44], 0.22 * a * info.dark)
  fillAll(ctx, [255, 255, 255], 0.15 * a * info.lift)
}

/** A patchy mask over the sprite: soft patches from coarse noise, broken up by a fine grain, drawn stretched. */
function patchMask(random, scale, from, to, grain = 0) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const mask = canvas.getContext('2d')
  const image = mask.createImageData(size, size)
  const salt = Math.floor(random() * 100000)
  const offsetX = random() * 50
  const offsetY = random() * 50

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const patch = clouds(salt, offsetX + ((i / size) * scale), offsetY + ((j / size) * scale), 7)
      const fine = hash(salt, i, j, 9)
      const level = (patch * (1 - grain)) + (fine * grain)
      const at = ((j * size) + i) * 4
      image.data[at] = 0
      image.data[at + 1] = 0
      image.data[at + 2] = 0
      image.data[at + 3] = Math.round(smooth(from, to, level) * 255)
    }
  }

  mask.putImageData(image, 0, 0)
  return canvas
}

function drawMask(ctx, mask, colour, alpha) {
  // The mask's own alpha shapes the paint; the colour and strength come from here
  const tinted = document.createElement('canvas')
  tinted.width = mask.width
  tinted.height = mask.height
  const tint = tinted.getContext('2d')
  tint.drawImage(mask, 0, 0)
  tint.globalCompositeOperation = 'source-in'
  tint.fillStyle = rgba(colour, 1)
  tint.fillRect(0, 0, mask.width, mask.height)
  ctx.globalAlpha = clamp01(alpha)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tinted, 0, 0, 256, 256)
  ctx.globalAlpha = 1
}

/** Bites out of a stroke's edges: small rough shapes centred on its outline. */
function drawFlakes(ctx, random, a, outline, count) {
  ctx.fillStyle = rgba([0, 0, 0], 0.95 * a)

  for (let i = 0; i < count; i++) {
    const edge = Math.floor(random() * outline.length)
    const from = outline[edge]
    const to = outline[(edge + 1) % outline.length]
    const t = 0.15 + (0.7 * random())
    roughBlob(ctx, random, from[0] + ((to[0] - from[0]) * t), from[1] + ((to[1] - from[1]) * t), 3 + (5 * random()), 5)
    ctx.fill()
  }
}

/** Worn paint: soft patches of the stroke taken off. */
function drawWornPaint(ctx, random, a) {
  drawMask(ctx, patchMask(random, 3.2, 0.5, 0.78, 0.42), [0, 0, 0], 0.75 * a)
}

/** Fine specks at random points of a region, kept out of another. */
function drawSpecks(ctx, random, px, region, avoid, count, colour, alpha, box = [0, 0, 256, 256]) {
  ctx.fillStyle = rgba(colour, alpha)
  let placed = 0

  for (let tries = 0; (tries < count * 30) && (placed < count); tries++) {
    const x = box[0] + (random() * (box[2] - box[0]))
    const y = box[1] + (random() * (box[3] - box[1]))

    if (inside(region, x, y, 'evenodd') && ((avoid === null) || !inside(avoid, x, y))) {
      const size = px * (0.8 + (0.6 * random()))
      ctx.fillRect(x - (size / 2), y - (size / 2), size, size)
      placed++
    }
  }
}

// ---------- The box's body, shared by the mirror box ----------

/** Runs a drawing four times, once per corner block, turned there from the top left block. */
function eachBlock(ctx, random, chance, draw) {
  for (let q = 0; q < 4; q++) {
    if (random() >= chance) {
      continue
    }

    ctx.save()
    ctx.translate(MID, MID)
    ctx.rotate(q * Math.PI / 2)
    ctx.translate(-MID, -MID)
    draw()
    ctx.restore()
  }
}

function drawBoxEdges(ctx, random, a, px) {
  eachBlock(ctx, random, 0.8, () => {
    // Along the top left block's two outer edges, most near its outer corner: paint rubbed light in broken dashes
    ctx.lineWidth = px
    ctx.lineCap = 'butt'

    for (const edge of [0, 1]) {
      let at = 58.4 + (random() * 8)
      const end = 66 + (random() * 34)

      while (at < end) {
        const dash = px * (1 + (random() * 3))
        const strength = 0.75 * a * (0.35 + (0.65 * random()))
        const depth = px * (0.5 + (random() < 0.3 ? 1 : 0))

        ctx.strokeStyle = rgba([255, 255, 255], strength)
        ctx.beginPath()

        if (edge === 0) {
          ctx.moveTo(at, 58.4 + depth)
          ctx.lineTo(Math.min(103.5, at + dash), 58.4 + depth)
        } else {
          ctx.moveTo(58.4 + depth, at)
          ctx.lineTo(58.4 + depth, Math.min(103.5, at + dash))
        }

        ctx.stroke()
        at += dash + (px * (0.5 + (random() * 2.5)))
      }
    }

    // The very corner knocked a little darker
    if (random() < 0.5) {
      ctx.fillStyle = rgba([70, 66, 62], 0.3 * a)
      ctx.beginPath()
      ctx.moveTo(58.4, 58.4)
      ctx.lineTo(58.4 + 5 + (random() * 5), 58.4)
      ctx.lineTo(58.4, 58.4 + 5 + (random() * 5))
      ctx.closePath()
      ctx.fill()
    }
  })
}

function drawBoxScratches(ctx, random, a, px) {
  const count = 1 + Math.floor(random() * 3)

  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.translate(MID, MID)
    ctx.rotate(Math.floor(random() * 4) * Math.PI / 2)
    ctx.translate(-MID, -MID)
    // On the top left block mostly, else on the top tab
    const onTab = random() < 0.25
    const x = onTab ? 118 + (random() * 20) : 64 + (random() * 30)
    const y = onTab ? 61 + (random() * 14) : 64 + (random() * 20)
    scratch(ctx, px, x, y, (onTab ? 10 : 16) + (random() * 18), random() * Math.PI, [66, 68, 76, 0.6 * a], [255, 255, 255, 0.45 * a])
    ctx.restore()
  }
}

function drawBoxDents(ctx, random, a, px) {
  const count = 1 + Math.floor(random() * 2)

  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.translate(MID, MID)
    ctx.rotate(Math.floor(random() * 4) * Math.PI / 2)
    ctx.translate(-MID, -MID)
    const x = 58.4 + 6 + (random() * 14)
    const y = 58.4 + 6 + (random() * 14)
    const radius = Math.max(px * 1.5, 7 + (random() * 7))
    roughBlob(ctx, random, x, y, radius, 6)
    ctx.fillStyle = rgba([112, 110, 112], 0.55 * a)
    ctx.fill()
    ctx.lineWidth = px * 0.8
    ctx.strokeStyle = rgba([255, 255, 255], 0.5 * a)
    ctx.stroke()
    ctx.restore()
  }
}

function drawBoxDisc(ctx, random, a, px) {
  const angle = random() * Math.PI * 2
  const offset = 8 + (random() * 10)
  const x = MID + (Math.cos(angle) * offset)
  const y = MID + (Math.sin(angle) * offset)
  // A broad, flat rubbed patch, not a highlight
  const sheen = ctx.createRadialGradient(x, y, 4, x, y, 26 + (random() * 10))
  sheen.addColorStop(0, rgba([255, 255, 255], 0.3 * a))
  sheen.addColorStop(0.6, rgba([255, 255, 255], 0.2 * a))
  sheen.addColorStop(1, rgba([255, 255, 255], 0))
  ctx.fillStyle = sheen
  ctx.fillRect(MID - 32, MID - 32, 64, 64)
  // A faint ring rubbed round it
  const start = random() * Math.PI * 2
  ctx.strokeStyle = rgba([92, 90, 92], 0.3 * a)
  ctx.lineWidth = px
  ctx.beginPath()
  ctx.arc(MID, MID, 21 + (random() * 5), start, start + 2 + (random() * 3))
  ctx.stroke()
}

function drawBoxDust(ctx, random, a, px, plates) {
  ctx.save()
  ctx.clip(plates)
  fillAll(ctx, [150, 140, 124], 0.16 * a)
  ctx.restore()
  // Specks in the dark channels between the plates
  drawSpecks(ctx, random, px, PATHS.boxCore(), plates, 5 + Math.floor(random() * 8), [178, 172, 160], 0.6 * a, [61, 61, 195, 195])
}

// ---------- The button and the switch ----------

function drawWornRing(ctx, random, a, px) {
  const salt = Math.floor(random() * 10000)
  const segments = 36
  const radius = 79 + (random() * 2)

  ctx.lineWidth = Math.max(px, 6)
  ctx.lineCap = 'butt'

  for (let i = 0; i < segments; i++) {
    const from = (i / segments) * Math.PI * 2
    const heavy = smooth(0.35, 0.85, valueNoise(salt, i * 0.35, 0, 3))
    ctx.strokeStyle = rgba([96, 90, 84], 0.45 * a * heavy)
    ctx.beginPath()
    ctx.arc(MID, MID, radius, from, from + ((Math.PI * 2) / segments) + 0.01)
    ctx.stroke()
  }
}

function drawPlateScratches(ctx, random, a, px) {
  const count = 1 + Math.floor(random() * 3)

  for (let i = 0; i < count; i++) {
    // On the plate's arcs between the clamps: up, right, down or left
    const side = (Math.floor(random() * 4) * Math.PI / 2) - (Math.PI / 2) + ((random() - 0.5) * 0.5)
    const reach = 82 + (random() * 16)
    const x = MID + (Math.cos(side) * reach)
    const y = MID + (Math.sin(side) * reach)
    scratch(ctx, px, x, y, 12 + (random() * 16), side + (Math.PI / 2) + ((random() - 0.5) * 1.4), [92, 98, 110, 0.8 * a], null)
  }
}

function drawClampWear(ctx, random, a, px) {
  ctx.lineCap = 'round'

  for (const clamp of BUTTON_CLAMPS) {
    if (random() >= 0.7) {
      continue
    }

    // Worn pale along its two outer edges, near the outer corner
    const outer = [clamp[2], clamp[3], clamp[0], clamp[1]]
    ctx.strokeStyle = rgba([172, 192, 188], 0.7 * a)
    ctx.lineWidth = Math.max(px, 5)

    for (const [from, to] of [[outer[0], outer[1]], [outer[0], outer[3]]]) {
      if (random() < 0.3) {
        continue
      }

      const t0 = random() * 0.3
      const t1 = t0 + 0.2 + (random() * 0.35)
      ctx.beginPath()
      ctx.moveTo(from[0] + ((to[0] - from[0]) * t0), from[1] + ((to[1] - from[1]) * t0))
      ctx.lineTo(from[0] + ((to[0] - from[0]) * t1), from[1] + ((to[1] - from[1]) * t1))
      ctx.stroke()
    }
  }
}

function drawPlateDust(ctx, random, a, px) {
  ctx.strokeStyle = rgba([140, 140, 140], 0.25 * a)
  ctx.lineWidth = Math.max(px, 4)
  ctx.beginPath()
  ctx.arc(MID, MID, 100.5, 0, Math.PI * 2)
  ctx.stroke()
  const ring = new Path2D()
  addCircle(ring, 102.5)
  addCircle(ring, 90, true)
  drawSpecks(ctx, random, px, ring, PATHS.buttonClamps(), 6 + Math.floor(random() * 9), [110, 110, 114], 0.7 * a)
}

function drawDomeFinish(ctx, random, a, px, sheenOnly) {
  if (sheenOnly || (random() < 0.5)) {
    const angle = random() * Math.PI * 2
    const offset = 12 + (random() * 24)
    const x = MID + (Math.cos(angle) * offset)
    const y = MID + (Math.sin(angle) * offset)
    const sheen = ctx.createRadialGradient(x, y, 0, x, y, 22 + (random() * 16))
    sheen.addColorStop(0, rgba([255, 255, 255], (sheenOnly ? 0.3 : 0.2) * a))
    sheen.addColorStop(1, rgba([255, 255, 255], 0))
    ctx.fillStyle = sheen
    ctx.fillRect(40, 40, 176, 176)
  } else {
    fillAll(ctx, [128, 104, 100], 0.18 * a)
  }
}

// ---------- The chevrons and the turntable ----------

function drawRings(ctx, random, a, px) {
  const count = 5 + Math.floor(random() * 8)
  ctx.lineWidth = px
  ctx.lineCap = 'round'

  for (let i = 0; i < count; i++) {
    const radius = 22 + (random() * 66)
    const start = random() * Math.PI * 2
    const sweep = 0.4 + (random() * 3.4)
    ctx.strokeStyle = (random() < 0.65) ? rgba([126, 130, 140], 0.35 * a) : rgba([255, 255, 255], 0.25 * a)
    ctx.beginPath()
    ctx.arc(MID, MID, radius, start, start + sweep)
    ctx.stroke()
  }
}

function drawCutDirt(ctx, random, a, px) {
  const salt = Math.floor(random() * 10000)
  const segments = 48

  ctx.lineCap = 'butt'
  ctx.lineWidth = Math.max(px, 7)

  for (let i = 0; i < segments; i++) {
    const from = (i / segments) * Math.PI * 2
    const heavy = smooth(0.4, 0.9, valueNoise(salt, i * 0.3, 0, 5))
    ctx.strokeStyle = rgba([98, 102, 112], 0.55 * a * heavy)
    ctx.beginPath()
    ctx.arc(MID, MID, 88, from, from + ((Math.PI * 2) / segments) + 0.01)
    ctx.stroke()
  }
}

// ---------- The grate ----------

function drawWornBars(ctx, random, a) {
  const across = random() < 0.5
  const centre = 70 + (random() * 116)
  const half = 22 + (random() * 16)
  const band = across ? ctx.createLinearGradient(0, centre - half, 0, centre + half) : ctx.createLinearGradient(centre - half, 0, centre + half, 0)
  band.addColorStop(0, rgba([206, 210, 216], 0))
  band.addColorStop(0.5, rgba([206, 210, 216], 0.35 * a))
  band.addColorStop(1, rgba([206, 210, 216], 0))
  ctx.fillStyle = band
  ctx.fillRect(0, 0, 256, 256)
}

function drawSilt(ctx, random, a) {
  const count = 2 + Math.floor(random() * 6)
  ctx.fillStyle = rgba([92, 90, 84], 0.65 * a)

  for (let i = 0; i < count; i++) {
    const slot = GRATE_SLOTS[Math.floor(random() * GRATE_SLOTS.length)]
    const fill = 0.3 + (random() * 0.5)
    const side = Math.floor(random() * 4)
    const depth = 23 * fill
    const x = slot[0] + ((side === 1) ? 23 - depth : 0)
    const y = slot[1] + ((side === 2) ? 23 - depth : 0)
    ctx.beginPath()
    ctx.roundRect(x, y, ((side === 0) || (side === 2)) ? 23 : depth, ((side === 1) || (side === 3)) ? 23 : depth, 4)
    ctx.fill()
  }
}

function drawGrateDent(ctx, random, a, px) {
  ctx.save()
  ctx.translate(MID, MID)
  ctx.rotate(Math.floor(random() * 4) * Math.PI / 2)
  ctx.translate(-MID, -MID)
  const reach = 22 + (random() * 16)
  ctx.beginPath()
  ctx.moveTo(12, 12)
  ctx.lineTo(12 + reach, 12)
  ctx.lineTo(12, 12 + reach)
  ctx.closePath()
  ctx.fillStyle = rgba([66, 68, 74], 0.5 * a)
  ctx.fill()
  ctx.strokeStyle = rgba([255, 255, 255], 0.5 * a)
  ctx.lineWidth = px
  ctx.beginPath()
  ctx.moveTo(12 + (reach * 0.8), 14)
  ctx.lineTo(14, 12 + (reach * 0.8))
  ctx.stroke()
  ctx.restore()
}

function drawGrateScratches(ctx, random, a, px) {
  const count = 1 + Math.floor(random() * 3)

  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.translate(MID, MID)
    ctx.rotate(Math.floor(random() * 4) * Math.PI / 2)
    ctx.translate(-MID, -MID)
    scratch(ctx, px, 40 + (random() * 176), 15 + (random() * 8), 30 + (random() * 50), (random() - 0.5) * 0.15, [226, 230, 236, 0.5 * a], null)
    ctx.restore()
  }
}

// ---------- Which layer draws on which sprite, clipped to what ----------

const BOX_SPRITES = ['box']
const MIRROR_SPRITES = ['box_mirror']
const BUTTON_SPRITES = ['button_up', 'button_pressed']

/** Per layer: the sprites it draws on, the part it is clipped to, and its drawing; erase takes paint off, meaning draws after the meaning-bearing parts are put back. */
const DRAWINGS = {
  'box.tone': {sprites: BOX_SPRITES, clip: PATHS.boxPlates, draw: (ctx, r, a) => drawTone(ctx, r, a, 0.14, 0.07)},
  'box.light': {sprites: BOX_SPRITES, clip: PATHS.boxPlates, draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'box.edges': {sprites: BOX_SPRITES, clip: PATHS.boxBlocks, draw: (ctx, r, a, px) => drawBoxEdges(ctx, r, a, px)},
  'box.scratches': {sprites: BOX_SPRITES, clip: PATHS.boxPlates, draw: (ctx, r, a, px) => drawBoxScratches(ctx, r, a, px)},
  'box.dents': {sprites: BOX_SPRITES, clip: PATHS.boxBlocks, draw: (ctx, r, a, px) => drawBoxDents(ctx, r, a, px)},
  'box.disc': {sprites: BOX_SPRITES, clip: PATHS.boxDisc, draw: (ctx, r, a, px) => drawBoxDisc(ctx, r, a, px)},
  'box.dust': {sprites: BOX_SPRITES, clip: null, draw: (ctx, r, a, px) => drawBoxDust(ctx, r, a, px, PATHS.boxPlates())},

  'mirror.tone': {sprites: MIRROR_SPRITES, clip: PATHS.mirrorPlates, draw: (ctx, r, a) => drawTone(ctx, r, a, 0.14, 0.07)},
  'mirror.light': {sprites: MIRROR_SPRITES, clip: PATHS.mirrorPlates, draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'mirror.edges': {sprites: MIRROR_SPRITES, clip: PATHS.boxBlocks, draw: (ctx, r, a, px) => drawBoxEdges(ctx, r, a, px)},
  'mirror.scratches': {sprites: MIRROR_SPRITES, clip: PATHS.mirrorPlates, draw: (ctx, r, a, px) => drawBoxScratches(ctx, r, a, px)},
  'mirror.dents': {sprites: MIRROR_SPRITES, clip: PATHS.boxBlocks, draw: (ctx, r, a, px) => drawBoxDents(ctx, r, a, px)},
  'mirror.dust': {sprites: MIRROR_SPRITES, clip: null, draw: (ctx, r, a, px) => drawBoxDust(ctx, r, a, px, PATHS.mirrorPlates())},
  'mirror.glass': {sprites: MIRROR_SPRITES, meaning: true, clip: PATHS.mirrorGlass, draw: (ctx, r, a) => {
    const film = ctx.createLinearGradient(MID - 41, MID + 41, MID + 41, MID - 41)
    const reach = 0.28 + (r() * 0.1)
    film.addColorStop(0, rgba([150, 156, 166], 0.35 * a))
    film.addColorStop(reach, rgba([150, 156, 166], 0))
    film.addColorStop(1 - reach, rgba([150, 156, 166], 0))
    film.addColorStop(1, rgba([150, 156, 166], 0.35 * a))
    ctx.fillStyle = film
    ctx.fillRect(40, 40, 176, 176)
  }},

  'button.tone': {sprites: BUTTON_SPRITES, clip: PATHS.buttonNeutral, draw: (ctx, r, a) => drawTone(ctx, r, a, 0.12, 0.06)},
  'button.light': {sprites: BUTTON_SPRITES, clip: PATHS.buttonNeutral, draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'button.ring': {sprites: BUTTON_SPRITES, clip: PATHS.buttonPlateRing, clip2: PATHS.buttonNotClamps, draw: (ctx, r, a, px) => drawWornRing(ctx, r, a, px)},
  'button.scratches': {sprites: BUTTON_SPRITES, clip: PATHS.buttonPlateRing, clip2: PATHS.buttonNotClamps, draw: (ctx, r, a, px) => drawPlateScratches(ctx, r, a, px)},
  'button.clamps': {sprites: BUTTON_SPRITES, clip: PATHS.buttonClamps, draw: (ctx, r, a, px) => drawClampWear(ctx, r, a, px)},
  'button.dust': {sprites: BUTTON_SPRITES, clip: PATHS.buttonPlateRing, clip2: PATHS.buttonNotClamps, draw: (ctx, r, a, px) => drawPlateDust(ctx, r, a, px)},
  'button.dome': {sprites: BUTTON_SPRITES, meaning: true, clip: PATHS.buttonDomeOnly, draw: (ctx, r, a, px) => drawDomeFinish(ctx, r, a, px, false)},

  'switch.tone': {sprites: ['switch'], clip: PATHS.buttonNeutral, draw: (ctx, r, a) => drawTone(ctx, r, a, 0.12, 0.06)},
  'switch.light': {sprites: ['switch'], clip: PATHS.buttonNeutral, draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'switch.ring': {sprites: ['switch'], clip: PATHS.buttonPlateRing, clip2: PATHS.buttonNotClamps, draw: (ctx, r, a, px) => drawWornRing(ctx, r, a, px)},
  'switch.scratches': {sprites: ['switch'], clip: PATHS.buttonPlateRing, clip2: PATHS.buttonNotClamps, draw: (ctx, r, a, px) => drawPlateScratches(ctx, r, a, px)},
  'switch.clamps': {sprites: ['switch'], clip: PATHS.buttonClamps, draw: (ctx, r, a, px) => drawClampWear(ctx, r, a, px)},
  'switch.dust': {sprites: ['switch'], clip: PATHS.buttonPlateRing, clip2: PATHS.buttonNotClamps, draw: (ctx, r, a, px) => drawPlateDust(ctx, r, a, px)},
  'switch.dome': {sprites: ['switch'], meaning: true, clip: PATHS.buttonDomeOnly, draw: (ctx, r, a, px) => drawDomeFinish(ctx, r, a, px, true)},

  'arrow.tone': {sprites: ['arrow'], clip: null, draw: (ctx, r, a) => drawTone(ctx, r, a, 0.18, 0)},
  'arrow.light': {sprites: ['arrow'], clip: null, draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'arrow.dirt': {sprites: ['arrow'], clip: null, draw: (ctx, r, a) => drawMask(ctx, patchMask(r, 2.6, 0.45, 0.85), [78, 72, 64], 0.3 * a)},
  'arrow.worn': {sprites: ['arrow'], erase: true, clip: null, draw: (ctx, r, a) => drawWornPaint(ctx, r, a)},
  'arrow.flakes': {sprites: ['arrow'], erase: true, clip: null, draw: (ctx, r, a) => drawFlakes(ctx, r, a, ARROW_OUTLINE, 5 + Math.floor(r() * 7))},
  'arrow.scratches': {sprites: ['arrow'], erase: true, clip: null, draw: (ctx, r, a, px) => {
    const count = 1 + Math.floor(r() * 2)

    for (let i = 0; i < count; i++) {
      const arm = (r() < 0.5) ? -1 : 1
      const t = 0.2 + (r() * 0.6)
      const x = 128 + (arm * 66 * t)
      const y = 103 + (60 * t)
      scratch(ctx, px, x, y, 30 + (r() * 40), r() * Math.PI, [0, 0, 0, 0.9 * a], null, 1.4)
    }
  }},

  'turntable.tone': {sprites: ['turntable'], clip: PATHS.discFace, draw: (ctx, r, a) => drawTone(ctx, r, a, 0.1, 0)},
  'turntable.light': {sprites: ['turntable', 'turntable_arrow'], clip: null, draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'turntable.rings': {sprites: ['turntable'], clip: PATHS.discFace, draw: (ctx, r, a, px) => drawRings(ctx, r, a, px)},
  'turntable.cut': {sprites: ['turntable'], clip: PATHS.discFace, draw: (ctx, r, a, px) => drawCutDirt(ctx, r, a, px)},
  'turntable.worn': {sprites: ['turntable_arrow'], erase: true, clip: null, draw: (ctx, r, a) => drawWornPaint(ctx, r, a)},
  'turntable.flakes': {sprites: ['turntable_arrow'], erase: true, clip: null, draw: (ctx, r, a) => drawFlakes(ctx, r, a, CHEVRON_OUTLINE, 4 + Math.floor(r() * 6))},

  'grate.tone': {sprites: ['ditch_bridged'], clip: PATHS.grateFace, rule: 'evenodd', draw: (ctx, r, a) => drawTone(ctx, r, a, 0.12, 0)},
  'grate.light': {sprites: ['ditch_bridged'], clip: PATHS.grateFace, rule: 'evenodd', draw: (ctx, r, a, px, info) => drawLight(ctx, a, info)},
  'grate.worn': {sprites: ['ditch_bridged'], clip: PATHS.grateBars, rule: 'evenodd', draw: (ctx, r, a) => drawWornBars(ctx, r, a)},
  'grate.silt': {sprites: ['ditch_bridged'], clip: null, draw: (ctx, r, a) => drawSilt(ctx, r, a)},
  'grate.dent': {sprites: ['ditch_bridged'], clip: PATHS.grateFrame, draw: (ctx, r, a, px) => drawGrateDent(ctx, r, a, px)},
  'grate.scratches': {sprites: ['ditch_bridged'], clip: PATHS.grateFrame, draw: (ctx, r, a, px) => drawGrateScratches(ctx, r, a, px)},
}

/** The parts each sprite's meaning lives in, put back as drawn after the plain parts are worn. */
const PROTECTED = {
  box_mirror: PATHS.mirrorFrame,
  button_up: PATHS.buttonDome,
  button_pressed: PATHS.buttonDome,
  switch: PATHS.buttonDome,
}

const THING_OF_SPRITE = {
  box: 'box',
  box_mirror: 'mirror',
  button_up: 'button',
  button_pressed: 'button',
  switch: 'switch',
  arrow: 'arrow',
  turntable: 'turntable',
  turntable_arrow: 'turntable',
  ditch_bridged: 'grate',
}

const THING_SALT = Object.fromEntries(THINGS.map((thing) => [thing.id, thing.salt]))
const LAYER_SALT = Object.fromEntries(LAYERS.map((layer, i) => [layer.key, 1000 + (i * 37)]))

/** The layers that draw on one instance of a thing: switched on, and, for wear, falling in its share. */
function layersFor(thing, number, settings) {
  return LAYERS.filter((layer) => {
    if ((layer.thing !== thing) || !settings.on[layer.key] || (settings.amount[layer.key] <= 0)) {
      return false
    }

    return (layer.type === 'tone') || (hash(settings.seed, LAYER_SALT[layer.key], number, 41) < (settings.share[layer.key] / 100))
  })
}

/** Draws one layer's drawing in the sprite's frame, scaled to a canvas of a tile size. */
function drawLayerOn(ctx, layer, scale, offset, number, settings, info, spriteName, composite = null) {
  const drawing = DRAWINGS[layer.key]
  const px = 1 / scale

  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, offset, offset)
  ctx.globalCompositeOperation = composite ?? (drawing.erase ? 'destination-out' : 'source-atop')

  if (drawing.clip !== null) {
    ctx.clip(drawing.clip(), drawing.rule ?? 'nonzero')
  }

  if (drawing.clip2 !== undefined) {
    ctx.clip(drawing.clip2(), 'evenodd')
  }

  drawing.draw(ctx, randomFrom(settings.seed, THING_SALT[layer.thing], number, LAYER_SALT[layer.key]), settings.amount[layer.key] / 100, px, info, spriteName)
  ctx.restore()
}

/** A sprite's own look for one instance: a copy of it with every layer drawn on, only where it has pixels. */
function buildSkin(spriteName, image, tileSize, margin, thing, number, settings, info) {
  const layers = layersFor(thing, number, settings).filter((layer) => DRAWINGS[layer.key].sprites.includes(spriteName))

  if (layers.length === 0) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  const scale = tileSize / 256
  ctx.drawImage(image, 0, 0)

  for (const layer of layers.filter((candidate) => !DRAWINGS[candidate.key].meaning)) {
    drawLayerOn(ctx, layer, scale, margin, number, settings, info, spriteName)
  }

  const kept = PROTECTED[spriteName]

  if (kept !== undefined) {
    // The meaning-bearing part as drawn, whatever was laid over it
    ctx.save()
    ctx.setTransform(scale, 0, 0, scale, margin, margin)
    ctx.clip(kept())
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0)
    ctx.restore()
  }

  for (const layer of layers.filter((candidate) => DRAWINGS[candidate.key].meaning)) {
    drawLayerOn(ctx, layer, scale, margin, number, settings, info, spriteName)
  }

  return canvas
}

/**
 * A plain box's wear alone, on a see-through canvas the size of its sprite at some tile size:
 * what is laid over the box the subject's painted sprite holds, so it keeps its look while carried.
 */
function boxWearOnly(tileSize, number, settings, info) {
  const layers = layersFor('box', number, settings)

  if (layers.length === 0) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = tileSize
  canvas.height = tileSize
  const ctx = canvas.getContext('2d')

  // Every box layer is clipped to the box's own parts, so laid over nothing it is the wear alone
  for (const layer of layers) {
    drawLayerOn(ctx, layer, tileSize / 256, 0, number, settings, info, 'box', 'source-over')
  }

  return canvas
}

// ---------- The pit, one joined tile at a time ----------

const PIT_DEPTH = 82 // How far a side runs down from the rim into the tile, in sprite pixels

/**
 * The sides a pit tile shows, from which neighbours are open: for each edge with no open
 * neighbour beyond it, the stretch along it (in sprite pixels) where its side shows.
 */
function pitSides(open) {
  const sides = []
  // Each quarter (screen frame, up is the row above): its side along the row above or below, unless that is open,
  // and its side along the column beside, unless that is open; a lone corner's two sides meet on the diagonal
  const quarter = (beside, aboveBelow, rowEdge, columnEdge, low, besideAtLow) => {
    const from = low ? 0 : 128

    if (!aboveBelow) {
      sides.push({edge: rowEdge, from: besideAtLow ? 0 : 128, to: besideAtLow ? 128 : 256, mitreFrom: !beside && besideAtLow, mitreTo: !beside && !besideAtLow})
    }

    if (!beside) {
      sides.push({edge: columnEdge, from: from, to: from + 128, mitreFrom: !aboveBelow && low, mitreTo: !aboveBelow && !low})
    }
  }

  quarter(open.left, open.up, 'top', 'left', true, true)
  quarter(open.right, open.up, 'top', 'right', true, false)
  quarter(open.left, open.down, 'bottom', 'left', false, true)
  quarter(open.right, open.down, 'bottom', 'right', false, false)

  return sides
}

/** A point at a distance along an edge and a depth into the pit from it, in the tile's frame. */
function onSide(edge, along, depth) {
  switch (edge) {
    case 'top': return [along, depth]
    case 'bottom': return [along, 256 - depth]
    case 'left': return [depth, along]
    default: return [256 - depth, along]
  }
}

function sideBand(path, side, depth) {
  const a = onSide(side.edge, side.from, 0)
  const b = onSide(side.edge, side.to, 0)
  const c = onSide(side.edge, side.to - (side.mitreTo ? depth : 0), depth)
  const d = onSide(side.edge, side.from + (side.mitreFrom ? depth : 0), depth)
  addPolygon(path, [a, b, c, d])
}

function drawPit(tile, settings, number, open, chamberIndex) {
  const layers = layersFor('pit', number, settings)

  if (layers.length === 0) {
    return
  }

  const ctx = tile.ctx
  const scale = tile.tileSize / 256
  const px = 1 / scale
  const sides = pitSides(open)
  const bands = new Path2D()
  sides.forEach((side) => sideBand(bands, side, PIT_DEPTH))

  ctx.save()
  ctx.scale(scale, scale)
  ctx.beginPath()
  ctx.rect(0, 0, 256, 256)
  ctx.clip()

  for (const layer of layers) {
    const a = settings.amount[layer.key] / 100
    const random = randomFrom(settings.seed, THING_SALT.pit, number, LAYER_SALT[layer.key])

    ctx.save()

    if (layer.id === 'tone') {
      // Lighter and darker in long stretches, from noise over the whole chamber, so joined sides meet without a seam
      ctx.clip(bands)
      const samples = 9
      const shade = document.createElement('canvas')
      shade.width = samples
      shade.height = samples
      const shadeCtx = shade.getContext('2d')
      const image = shadeCtx.createImageData(samples, samples)

      for (let j = 0; j < samples; j++) {
        for (let i = 0; i < samples; i++) {
          const level = clouds(settings.seed + chamberIndex, (tile.x + (i / (samples - 1))) / 2.5, (tile.row + (j / (samples - 1))) / 2.5, 71) - 0.5
          const at = ((j * samples) + i) * 4
          image.data[at] = (level > 0) ? 255 : 0
          image.data[at + 1] = (level > 0) ? 255 : 0
          image.data[at + 2] = (level > 0) ? 255 : 0
          image.data[at + 3] = Math.round(clamp01(Math.abs(level) * 2 * 0.16 * a * ((level > 0) ? 0.7 : 1)) * 255)
        }
      }

      shadeCtx.putImageData(image, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(shade, 0.5, 0.5, samples - 1, samples - 1, 0, 0, 256, 256)
    } else if (layer.id === 'streaks') {
      ctx.clip(bands)

      for (const side of sides) {
        const count = Math.round(((side.to - side.from) / 128) * (1 + (random() * 2.5)))

        for (let i = 0; i < count; i++) {
          const width = 6 + (random() * 12)
          const along = side.from + 14 + (random() * (side.to - side.from - 28 - width))
          const length = 22 + (random() * 40)
          const dark = random() < 0.7
          const colour = dark ? [0, 0, 0] : [206, 212, 220]
          const strength = (dark ? 0.5 : 0.18) * a
          const lines = Math.max(2, Math.round(width / px))

          // A soft band, as stains run: faint at its two sides and at both ends
          for (let k = 0; k < lines; k++) {
            const across = (k + 0.5) / lines
            const bell = Math.sin(across * Math.PI)
            const offset = along + (across * width)
            const top = onSide(side.edge, offset, 7)
            const middle = onSide(side.edge, offset, 7 + (length * 0.3))
            const bottom = onSide(side.edge, offset, 7 + length)
            const fade = ctx.createLinearGradient(top[0], top[1], bottom[0], bottom[1])
            fade.addColorStop(0, rgba(colour, 0))
            fade.addColorStop(0.3, rgba(colour, strength * bell))
            fade.addColorStop(1, rgba(colour, 0))
            ctx.strokeStyle = fade
            ctx.lineWidth = (width / lines) + 0.5
            ctx.beginPath()
            ctx.moveTo(top[0], top[1])
            ctx.lineTo(middle[0], middle[1])
            ctx.lineTo(bottom[0], bottom[1])
            ctx.stroke()
          }
        }
      }
    } else if (layer.id === 'rim') {
      ctx.fillStyle = rgba([44, 46, 50], 0.9 * a)

      for (const side of sides) {
        if ((random() < 0.4) || ((side.to - side.from) < 60)) {
          continue
        }

        const length = 8 + (random() * 18)
        const along = side.from + 16 + (random() * (side.to - side.from - 32 - length))
        const a0 = onSide(side.edge, along, 1.5)
        const a1 = onSide(side.edge, along + length, 5.5)
        ctx.fillRect(Math.min(a0[0], a1[0]), Math.min(a0[1], a1[1]), Math.max(px, Math.abs(a1[0] - a0[0])), Math.max(px, Math.abs(a1[1] - a0[1])))
      }
    } else if (layer.id === 'debris') {
      const floorOfPit = new Path2D()
      addPolygon(floorOfPit, rectPoints(0, 0, 256, 256))
      const avoid = new Path2D()
      sides.forEach((side) => sideBand(avoid, side, PIT_DEPTH + 8))
      const count = 2 + Math.floor(random() * 4)
      ctx.fillStyle = rgba([66, 68, 72], 0.6 * a)
      let placed = 0

      for (let tries = 0; (tries < 60) && (placed < count); tries++) {
        const x = 16 + (random() * 224)
        const y = 16 + (random() * 224)

        if (!inside(avoid, x, y)) {
          roughBlob(ctx, random, x, y, Math.max(px * 0.7, 2 + (random() * 3)), 5)
          ctx.fill()
          placed++
        }
      }
    } else if (layer.id === 'dust') {
      ctx.clip(bands)

      for (const side of sides) {
        const top = onSide(side.edge, side.from, 2)
        const bottom = onSide(side.edge, side.from, 22)
        const film = ctx.createLinearGradient(top[0], top[1], bottom[0], bottom[1])
        film.addColorStop(0, rgba([150, 152, 156], 0.5 * a))
        film.addColorStop(1, rgba([130, 132, 136], 0))
        ctx.fillStyle = film
        const band = new Path2D()
        sideBand(band, side, 22)
        ctx.fill(band)
      }
    }

    ctx.restore()
  }

  ctx.restore()
}

// ---------- The floor's own marks, on element tiles, when they are allowed there ----------

function drawFloorScratches(ctx, T, random, strength) {
  const count = 2 + Math.floor(random() * 3)
  const angle = random() * Math.PI
  const width = Math.max(1, T * 0.009)
  const cut = [58, 64, 82, 0.24 * strength]
  const edge = [255, 255, 255, 0.55 * strength]
  const gap = (0.035 + (0.04 * random())) * T

  ctx.save()
  ctx.translate((0.25 + (0.5 * random())) * T, (0.25 + (0.5 * random())) * T)
  ctx.rotate(angle)

  for (let i = 0; i < count; i++) {
    const y = ((i - ((count - 1) / 2)) * gap) + ((random() - 0.5) * gap * 0.5)
    const half = (0.16 + (0.3 * random())) * T
    const middle = (random() - 0.5) * 0.25 * T
    scratch(ctx, width, middle, y, half * 2, 0, cut, edge)
  }

  ctx.restore()
}

function drawFloorChip(ctx, T, random, strength) {
  const a = (0.08 + (0.1 * random())) * T
  const b = (0.08 + (0.1 * random())) * T
  ctx.save()
  ctx.translate(T / 2, T / 2)
  ctx.rotate(Math.floor(random() * 4) * Math.PI / 2)
  ctx.translate(-T / 2, -T / 2)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(a, 0)
  ctx.lineTo(a * 0.68, b * 0.26)
  ctx.lineTo(a * 0.45, b * 0.49)
  ctx.lineTo(a * 0.21, b * 0.76)
  ctx.lineTo(0, b)
  ctx.closePath()
  ctx.fillStyle = rgba([122, 127, 140], 0.6 * strength)
  ctx.fill()
  ctx.strokeStyle = rgba([52, 57, 70], 0.4 * strength)
  ctx.lineWidth = Math.max(1, T * 0.008)
  ctx.stroke()
  ctx.restore()
}

/** The floor's scratches and chipped corners, as the game draws them, on the tiles it keeps them off today. */
function floorUnderHook(info, settings) {
  return (ctx, T) => {
    for (let r = 0; r < info.H; r++) {
      for (let c = 0; c < info.W; c++) {
        const cell = info.cellAt(c, r)

        if (!['arrow', 'button', 'switch'].some((kind) => cell.kinds.includes(kind))) {
          continue
        }

        for (const [salt, draw, strength] of [[1000, drawFloorScratches, 0.24], [3000, drawFloorChip, 0.24]]) {
          if (hash(settings.seed, c, r, salt) < 0.3) {
            ctx.save()
            ctx.translate(c * T, r * T)
            ctx.beginPath()
            ctx.rect(0, 0, T, T)
            ctx.clip()
            draw(ctx, T, randomFrom(settings.seed, c, r, salt + 1), strength)
            ctx.restore()
          }
        }
      }
    }
  }
}

// ---------- A chamber's layout, and who is who in a state ----------

const chamberInfos = new Map()

/** What the layers need to know about a chamber: its tiles, and how far each tile's middle lies from a wall. */
function chamberInfo(index) {
  let info = chamberInfos.get(index)

  if (info !== undefined) {
    return info
  }

  const grid = Engine.grid(index)
  const W = grid.width
  const H = grid.height
  const cellAt = (c, r) => ((c < 0) || (r < 0) || (c >= W) || (r >= H)) ? undefined : grid.cells[(r * W) + c]
  const wall = (c, r) => cellAt(c, r)?.wall !== false
  const reach = 3
  const distance = new Float32Array(W * H)

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      let nearest = reach

      for (let rr = r - reach; rr <= r + reach; rr++) {
        for (let cc = c - reach; cc <= c + reach; cc++) {
          if (wall(cc, rr)) {
            const dx = Math.max(cc - (c + 0.5), 0, (c + 0.5) - (cc + 1))
            const dy = Math.max(rr - (r + 0.5), 0, (r + 0.5) - (rr + 1))
            nearest = Math.min(nearest, Math.hypot(dx, dy))
          }
        }
      }

      distance[(r * W) + c] = nearest
    }
  }

  info = {
    index: index,
    W: W,
    H: H,
    cellAt: cellAt,
    wall: wall,
    distance: distance,
    board: Engine.chambers[index].board,
  }
  chamberInfos.set(index, info)

  return info
}

/** The floor's room light at a tile (column, row from the top): how dark beside a wall, how lifted in the open. */
function lightAt(info, c, r) {
  const d = info.distance[(r * info.W) + c] ?? 3
  return {dark: Math.exp(-d / 0.85), lift: smooth(1.1, 2.6, d)}
}

const destructions = new Map() // Each chamber's and step's count of destroyed boxes, worked out once

/** How many times each box has been destroyed by a step, along the recorded solution up to it. */
function destructionCounts(index, step) {
  const kept = destructions.get(`${index}:${step}`)

  if (kept !== undefined) {
    return kept
  }

  // From the nearest step already counted, so walking along the solution counts each step once
  let from = step - 1

  while ((from > 0) && !destructions.has(`${index}:${from}`)) {
    from--
  }

  let counts = (from > 0) ? destructions.get(`${index}:${from}`) : new Map()
  let before = Engine.instances(index, from)

  for (let s = from + 1; s <= step; s++) {
    const events = Engine.stepEvents(index, s)
    const after = Engine.instances(index, s)

    if (events.includes('boxDestroyed') || events.includes('fizzled')) {
      counts = new Map(counts)

      for (const box of after.boxes) {
        const was = before.boxes[box.index]
        const backAtStart = !box.carried && (box.x === box.startX) && (box.y === box.startY)
        const wasAway = was.carried || (was.x !== was.startX) || (was.y !== was.startY)

        if (backAtStart && wasAway) {
          counts.set(box.index, (counts.get(box.index) ?? 0) + 1)
        }
      }
    }

    destructions.set(`${index}:${s}`, counts)
    before = after
  }

  return counts
}

/** Who is who in one state: for each sprite drawn on a tile, its thing and its look's number, and where it is lit. */
function whoIsWho(index, step, settings) {
  const info = chamberInfo(index)
  const now = Engine.instances(index, step)
  const byTile = new Map()
  const pool = (number) => (settings.choices.alike === 'pool') ? (number % settings.pool) : number
  const at = (x, y) => `${x},${y}`
  const openDitches = new Set()
  const ditchNumbers = new Map()

  for (const element of now.elements) {
    const tile = at(element.x, element.y)
    const light = lightAt(info, element.x, element.row)

    if (element.kind === 'arrow') {
      byTile.set(`arrow|${tile}`, {thing: 'arrow', number: pool(element.index), light: light})
      byTile.set(`turntable|${tile}`, {thing: 'turntable', number: pool(element.index), light: light})
    } else if (element.kind === 'button') {
      byTile.set(`button|${tile}`, {thing: 'button', number: pool((info.board === 'button') ? element.index % 12 : element.index), light: light})
    } else if (element.kind === 'switch') {
      byTile.set(`switch|${tile}`, {thing: 'switch', number: pool(element.index), light: light})
    } else if (element.kind === 'ditch') {
      byTile.set(`grate|${tile}`, {thing: 'grate', number: pool(element.index), light: light})
      ditchNumbers.set(tile, pool(element.index))

      if (element.blocked) {
        openDitches.add(tile)
      }
    }
  }

  const destroyed = (settings.choices.destroyed === 'fresh') ? destructionCounts(index, step) : new Map()
  const boxNumber = (box) => pool(box.index + (7919 * (destroyed.get(box.index) ?? 0)))
  const boxLight = (box) => (settings.choices.boxLight === 'start') ? lightAt(info, box.startX, info.H - 1 - box.startY) : lightAt(info, box.x, box.row)
  let carried = null

  for (const box of now.boxes) {
    const who = {thing: (box.mirror === null) ? 'box' : 'mirror', number: boxNumber(box), light: boxLight(box), box: box.index}

    if (box.carried) {
      carried = who
    } else {
      byTile.set(`${who.thing}|${at(box.x, box.y)}`, who)
    }
  }

  return {
    find: (thing, x, y) => byTile.get(`${thing}|${at(x, y)}`) ?? null,
    carried: carried,
    open: (x, y) => openDitches.has(at(x, y)),
    ditchNumber: (x, y) => ditchNumbers.get(at(x, y)) ?? null,
    boxTiles: new Set(now.boxes.map((box) => at(box.x, box.y))),
  }
}

// ---------- The hooks, and drawing a chamber with them ----------

const skins = new Map() // Each instance's look at a tile size, made once per combination of settings
const SKINS_KEPT = 4000

function keepSkin(key, make) {
  if (skins.has(key)) {
    return skins.get(key)
  }

  if (skins.size >= SKINS_KEPT) {
    skins.clear()
  }

  const skin = make()
  skins.set(key, skin)

  return skin
}

/** The look laid over the box the subject's painted sprite holds: the box's wear, held still in the room. */
function carriedSkin(sprite, who, settings, settingsKey) {
  const angle = (sprite.path === 'rotated') ? sprite.angle : WAY_ANGLE[sprite.way]
  const key = `${settingsKey}|carried|${sprite.tileSize}|${who.number}|${who.light.dark.toFixed(3)},${who.light.lift.toFixed(3)}|${angle.toFixed(3)}`

  return keepSkin(key, () => {
    const side = Math.round(sprite.tileSize * CARRIED_BOX_SIZE)
    const wear = boxWearOnly(side, who.number, settings, who.light)

    if (wear === null) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = sprite.image.width
    canvas.height = sprite.image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(sprite.image, 0, 0)
    // Only on the painted box's grey, never on the hands that hold it
    const grey = document.createElement('canvas')
    grey.width = canvas.width
    grey.height = canvas.height
    const greyCtx = grey.getContext('2d')
    const size = sprite.tileSize
    const half = size / 2
    greyCtx.translate(sprite.margin + half, sprite.margin + half)
    greyCtx.translate(0, -CARRIED_BOX_AHEAD * size)
    // The sprite is drawn facing up and turned the way the subject faces: turn the wear back, so it stays still in the room
    greyCtx.rotate(-angle)
    greyCtx.drawImage(wear, -side / 2, -side / 2)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const wearPixels = greyCtx.getImageData(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < pixels.length; i += 4) {
      const high = Math.max(pixels[i], pixels[i + 1], pixels[i + 2])
      const low = Math.min(pixels[i], pixels[i + 1], pixels[i + 2])

      if ((pixels[i + 3] < 200) || ((high - low) > 14)) {
        wearPixels.data[i + 3] = 0
      }
    }

    greyCtx.putImageData(wearPixels, 0, 0)
    ctx.drawImage(grey, 0, 0)

    return canvas
  })
}

/** A plain box turned the way the subject faced, its wear turned back so it lies as it did in the room. */
function turnedBoxSkin(sprite, who, settings, settingsKey) {
  const key = `${settingsKey}|turnedBox|${sprite.tileSize}|${who.number}|${who.light.dark.toFixed(3)},${who.light.lift.toFixed(3)}|${sprite.way}`

  return keepSkin(key, () => {
    const wear = boxWearOnly(sprite.tileSize, who.number, settings, who.light)

    if (wear === null) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = sprite.image.width
    canvas.height = sprite.image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(sprite.image, 0, 0)
    ctx.globalCompositeOperation = 'source-atop'
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-WAY_ANGLE[sprite.way])
    ctx.drawImage(wear, -sprite.tileSize / 2, -sprite.tileSize / 2)

    return canvas
  })
}

/**
 * Which box a box breaking up or falling was: drawn where it last lay, or from the subject's hands,
 * a step or a few ago, since its pieces outlast the step that destroyed it.
 */
function destroyedBoxWho(index, step, settings, sprite) {
  const inHands = (Math.abs(sprite.x - Math.round(sprite.x)) > 0.01) || (Math.abs(sprite.y - Math.round(sprite.y)) > 0.01)
  const thing = THING_OF_SPRITE[sprite.name]

  for (let back = 1; back <= 4; back++) {
    if (step - back < 0) {
      break
    }

    const earlier = whoIsWho(index, step - back, settings)
    const found = inHands ? earlier.carried : earlier.find(thing, Math.round(sprite.x), Math.round(sprite.y))

    if ((found !== null) && (found.thing === thing)) {
      return found
    }
  }

  return null
}

/** The page's hooks for one drawing of a chamber in a state with some settings, or null settings for the original. */
function hooksFor(index, step, settings, capture = null, surfaceDetail = true) {
  const info = chamberInfo(index)
  const listing = Engine.chambers[index]
  const hooks = {}

  if ((listing.board !== null) && (listing.board !== 'motion')) {
    const now = Engine.instances(index, step)
    const held = new Set(now.elements.filter((element) => element.kind === 'button').map((element) => `${element.x},${element.y}`))
    // A board shows no subject, and no box over the buttons it holds down
    hooks.hide = (sprite) => sprite.name.startsWith('subject') || ((sprite.name === 'box') && held.has(`${sprite.x},${sprite.y}`))
  }

  if (settings === null) {
    if (capture !== null) {
      hooks.skin = (sprite) => {
        capture.push({name: sprite.name, x: sprite.x, y: sprite.y, original: sprite.image, skin: null})
        return null
      }
    }

    return hooks
  }

  const who = whoIsWho(index, step, settings)
  const settingsKey = `${index}:${JSON.stringify(settings)}`

  hooks.skin = (sprite) => {
    let skin = null

    if (sprite.name === 'subject_holding_box') {
      if ((settings.choices.carried === 'worn') && (who.carried !== null) && (who.carried.thing === 'box')) {
        skin = carriedSkin(sprite, who.carried, settings, settingsKey)
      }
    } else if (((sprite.path === 'shrunk') || (sprite.path === 'pieces')) && ((sprite.name === 'box') || (sprite.name === 'box_mirror'))) {
      const instance = destroyedBoxWho(index, step, settings, sprite)

      if ((instance !== null) && ((sprite.name === 'box_mirror') || (settings.choices.carried === 'worn') || (Math.abs(sprite.x - Math.round(sprite.x)) < 0.01))) {
        skin = ((sprite.name === 'box') && (sprite.way !== 'UP')) ? turnedBoxSkin(sprite, instance, settings, settingsKey) : keepSkin(`${settingsKey}|${sprite.name}|${sprite.tileSize}|${instance.number}|${instance.light.dark.toFixed(3)},${instance.light.lift.toFixed(3)}`, () => buildSkin(sprite.name, sprite.image, sprite.tileSize, sprite.margin, THING_OF_SPRITE[sprite.name], instance.number, settings, instance.light))
      }
    } else {
      const thing = THING_OF_SPRITE[sprite.name]
      const instance = (thing === undefined) ? null : who.find(thing, sprite.x, sprite.y)

      if (instance !== null) {
        const key = `${settingsKey}|${sprite.name}|${sprite.tileSize}|${instance.number}|${instance.light.dark.toFixed(3)},${instance.light.lift.toFixed(3)}`
        skin = keepSkin(key, () => buildSkin(sprite.name, sprite.image, sprite.tileSize, sprite.margin, thing, instance.number, settings, instance.light))
      }
    }

    if (capture !== null) {
      capture.push({name: sprite.name, x: sprite.x, y: sprite.y, original: sprite.image, skin: skin})
    }

    return skin
  }

  hooks.afterTile = (tile) => {
    if (tile.name !== 'ditch') {
      return
    }

    const number = who.ditchNumber(tile.x, tile.y)

    if (number !== null) {
      drawPit(tile, settings, number, {
        up: who.open(tile.x, tile.y + 1),
        down: who.open(tile.x, tile.y - 1),
        left: who.open(tile.x - 1, tile.y),
        right: who.open(tile.x + 1, tile.y),
      }, index)
    }
  }

  if ((settings.choices.floorWear === 'on') && surfaceDetail) {
    hooks.floor = floorUnderHook(info, settings)
  }

  return hooks
}

/** Draws a chamber as the game does, at a state along its recorded solution, with the settings' layers (null for the original). */
function drawChamber(canvas, index, tileSize, settings, options = {}) {
  Engine.render(canvas, index, tileSize, {
    step: options.step ?? 0,
    surfaceDetail: options.surfaceDetail !== false,
    hooks: hooksFor(index, options.step ?? 0, settings, options.capture ?? null, options.surfaceDetail !== false),
  })
}

// ---------- Meaning checks: how far the layers moved what carries meaning ----------

function toLab(rgb) {
  const linear = rgb.map((value) => {
    const c = value / 255
    return (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const x = ((linear[0] * 0.4124) + (linear[1] * 0.3576) + (linear[2] * 0.1805)) / 0.95047
  const y = (linear[0] * 0.2126) + (linear[1] * 0.7152) + (linear[2] * 0.0722)
  const z = ((linear[0] * 0.0193) + (linear[1] * 0.1192) + (linear[2] * 0.9505)) / 1.08883
  const f = (t) => (t > 0.008856) ? Math.cbrt(t) : ((7.787 * t) + (16 / 116))
  return [(116 * f(y)) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

function deltaE(a, b) {
  const la = toLab(a)
  const lb = toLab(b)
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2])
}

/** The average colour of a board's canvas over one tile, where a test on the sprite's 256 px frame holds. */
function meanColour(data, width, column, row, tileSize, test) {
  const sum = [0, 0, 0]
  let count = 0
  const left = column * tileSize
  const top = row * tileSize

  for (let j = 0; j < tileSize; j++) {
    for (let i = 0; i < tileSize; i++) {
      const u = ((i + 0.5) / tileSize) * 256
      const v = ((j + 0.5) / tileSize) * 256

      if (test(u, v)) {
        const at = (((top + j) * width) + left + i) * 4
        sum[0] += data[at]
        sum[1] += data[at + 1]
        sum[2] += data[at + 2]
        count++
      }
    }
  }

  return (count === 0) ? [0, 0, 0] : sum.map((value) => value / count)
}

const within = (radius) => (u, v) => Math.hypot(u - MID, v - MID) <= radius

/**
 * Measures the line-up boards of the things on the list, as the game draws them and with the
 * settings, at one tile size: how far each meaning-bearing part moved, for the worst instance.
 */
function meaningChecks(settings, tileSize) {
  const board = (name) => Engine.chambers.findIndex((chamber) => chamber.board === name)
  const draw = (index, chosen) => {
    const canvas = document.createElement('canvas')
    drawChamber(canvas, index, tileSize, chosen)
    return {data: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width}
  }
  const pairs = (name) => {
    const index = board(name)
    return {index: index, before: draw(index, null), after: draw(index, settings), rows: Engine.chambers[index].height}
  }
  const worst = (values, pick) => values.reduce((most, value) => pick(most, value))
  const twelve = Array.from({length: 12}, (_unused, i) => i + 1)
  const checks = []

  {
    // Buttons: row 1 of the board (from the top, 6 rows tall) released, row 4 pressed; the same twelve looks
    const {before, after} = pairs('button')
    const dome = within(68)
    const moved = []
    const gaps = []

    for (const column of twelve) {
      const upBefore = meanColour(before.data, before.width, column, 2, tileSize, dome)
      const upAfter = meanColour(after.data, after.width, column, 2, tileSize, dome)
      const downBefore = meanColour(before.data, before.width, column, 4, tileSize, dome)
      const downAfter = meanColour(after.data, after.width, column, 4, tileSize, dome)
      moved.push(Math.max(deltaE(upBefore, upAfter), deltaE(downBefore, downAfter)))
      gaps.push(deltaE(upAfter, downAfter) / Math.max(0.001, deltaE(upBefore, downBefore)))
    }

    checks.push({thing: 'button', name: 'Dome’s red moved', value: worst(moved, Math.max), unit: 'ΔE', good: 2, fair: 5, note: 'Worst of twelve, released or pressed. Under 2 the eye can’t tell.'})
    checks.push({thing: 'button', name: 'Released to pressed gap kept', value: 100 * worst(gaps, Math.min), unit: '%', good: 95, fair: 85, higher: true, note: 'How much of the difference between the two reds is left, worst button.'})
  }

  {
    const {before, after} = pairs('switch')
    const dome = within(68)
    const moved = []
    const amber = []

    for (const column of twelve) {
      const was = meanColour(before.data, before.width, column, 2, tileSize, dome)
      const now = meanColour(after.data, after.width, column, 2, tileSize, dome)
      moved.push(deltaE(was, now))
      amber.push(deltaE(now, [250, 194, 44]) - deltaE(was, [250, 194, 44]))
    }

    checks.push({thing: 'switch', name: 'Dome’s yellow moved', value: worst(moved, Math.max), unit: 'ΔE', good: 2, fair: 5, note: 'Worst of twelve.'})
    checks.push({thing: 'switch', name: 'Nearer a lit antline’s amber by', value: Math.max(0, -worst(amber, Math.min)), unit: 'ΔE', good: 1, fair: 3, note: 'How much closer the dome came to the antline’s amber; 0 is as far as now.'})
  }

  {
    const {before, after} = pairs('arrow')
    const paint = PATHS.arrowPaint()
    const kept = []

    for (const column of twelve) {
      const way = (column - 1) % 4
      // The board's arrows point up, right, down, left in turn: test the paint turned the same way
      const test = (u, v) => { const p = turned([u, v], (4 - way) % 4); return inside(paint, p[0], p[1]) }
      const ring = (u, v) => !test(u, v) && (Math.hypot(u - MID, v - MID) < 110)
      const contrastBefore = deltaE(meanColour(before.data, before.width, column, 2, tileSize, test), meanColour(before.data, before.width, column, 2, tileSize, ring))
      const contrastAfter = deltaE(meanColour(after.data, after.width, column, 2, tileSize, test), meanColour(after.data, after.width, column, 2, tileSize, ring))
      kept.push(contrastAfter / Math.max(0.001, contrastBefore))
    }

    checks.push({thing: 'arrow', name: 'Chevron against the floor kept', value: 100 * worst(kept, Math.min), unit: '%', good: 70, fair: 55, higher: true, note: 'How much of the chevron’s contrast with the floor round it is left, worst arrow. Above 70 % it is still the strongest mark on its tile.'})
  }

  {
    const {before, after} = pairs('turntable')
    const face = within(86)
    const pointing = []
    const kept = []

    for (const column of twelve) {
      // How much the disc's face differs from itself a quarter turn round, away from the chevron: none means it points nowhere
      const asymmetry = (shot) => {
        let total = 0
        let count = 0

        for (let q = 0; q < 4; q++) {
          const band = (u, v) => { const r = Math.hypot(u - MID, v - MID); const angle = Math.atan2(v - MID, u - MID); const sector = Math.floor((((angle + (Math.PI / 4)) / (Math.PI / 2)) + 4) % 4); return (r > 71) && (r < 84) && (sector === q) }
          const colour = meanColour(shot.data, shot.width, column, 2, tileSize, band)
          total += colour[0] + colour[1] + colour[2]
          count++
        }

        const mean = total / count
        let spreadTotal = 0

        for (let q = 0; q < 4; q++) {
          const band = (u, v) => { const r = Math.hypot(u - MID, v - MID); const angle = Math.atan2(v - MID, u - MID); const sector = Math.floor((((angle + (Math.PI / 4)) / (Math.PI / 2)) + 4) % 4); return (r > 71) && (r < 84) && (sector === q) }
          const colour = meanColour(shot.data, shot.width, column, 2, tileSize, band)
          spreadTotal = Math.max(spreadTotal, Math.abs(colour[0] + colour[1] + colour[2] - mean) / 3)
        }

        return spreadTotal
      }

      pointing.push(asymmetry(after) - asymmetry(before))
      const chevron = PATHS.chevronPaint()
      const way = (column - 1) % 4
      const test = (u, v) => { const p = turned([u, v], (4 - way) % 4); return inside(chevron, p[0], p[1]) }
      const ring = (u, v) => !test(u, v) && face(u, v)
      const contrastBefore = deltaE(meanColour(before.data, before.width, column, 2, tileSize, test), meanColour(before.data, before.width, column, 2, tileSize, ring))
      const contrastAfter = deltaE(meanColour(after.data, after.width, column, 2, tileSize, test), meanColour(after.data, after.width, column, 2, tileSize, ring))
      kept.push(contrastAfter / Math.max(0.001, contrastBefore))
    }

    checks.push({thing: 'turntable', name: 'Chevron against the disc kept', value: 100 * worst(kept, Math.min), unit: '%', good: 70, fair: 55, higher: true, note: 'How much of the chevron’s contrast with the disc round it is left, worst turnable arrow.'})
    checks.push({thing: 'turntable', name: 'Disc leaning one way by', value: Math.max(0, worst(pointing, Math.max)), unit: 'levels', good: 3, fair: 6, note: 'How much brighter or darker one quarter of the disc’s rim band is than the others, beyond the sprite’s own.'})
  }

  {
    const {before, after} = pairs('box_mirror')
    const frame = PATHS.mirrorFrame()
    const moved = []

    for (const column of twelve) {
      const backslash = column > 6
      const test = (u, v) => { const p = backslash ? turned([u, v], 3) : [u, v]; return inside(frame, p[0], p[1]) }
      moved.push(deltaE(meanColour(before.data, before.width, column, 2, tileSize, test), meanColour(after.data, after.width, column, 2, tileSize, test)))
    }

    checks.push({thing: 'mirror', name: 'Mirror moved', value: worst(moved, Math.max), unit: 'ΔE', good: 2, fair: 5, note: 'Frame, glass and glint together, worst of twelve.'})
  }

  {
    const {before, after} = pairs('box')
    const body = (u, v) => (u > 58) && (u < 198) && (v > 58) && (v < 198)
    const moved = twelve.map((column) => deltaE(meanColour(before.data, before.width, column, 2, tileSize, body), meanColour(after.data, after.width, column, 2, tileSize, body)))
    checks.push({thing: 'box', name: 'Box’s overall colour moved', value: worst(moved, Math.max), unit: 'ΔE', good: 6, fair: 10, note: 'Tone is meant to move it a little; past 10 it starts to read as another object.'})
  }

  {
    const {before, after} = pairs('ditch')
    // Row 2 from the top is the pit, a run open above and below; row 4 the grates
    const bottom = (u, v) => (v > 100) && (v < 156)
    const rim = (u, v) => ((v > 2) && (v < 5.5)) || ((v > 250.5) && (v < 254))
    const darkness = []
    const rims = []
    const slots = []
    const slot = (u, v) => GRATE_SLOTS.some((s) => (u > s[0] + 3) && (u < s[0] + 20) && (v > s[1] + 3) && (v < s[1] + 20))
    const bar = (u, v) => (u > 30) && (u < 226) && (v > 30) && (v < 226) && !GRATE_SLOTS.some((s) => (u > s[0] - 1) && (u < s[0] + 24) && (v > s[1] - 1) && (v < s[1] + 24))

    for (const column of twelve) {
      darkness.push(toLab(meanColour(after.data, after.width, column, 2, tileSize, bottom))[0] - toLab(meanColour(before.data, before.width, column, 2, tileSize, bottom))[0])
      const rimBefore = toLab(meanColour(before.data, before.width, column, 2, tileSize, rim))[0]
      const rimAfter = toLab(meanColour(after.data, after.width, column, 2, tileSize, rim))[0]
      rims.push(rimAfter / Math.max(0.001, rimBefore))
      const contrast = (shot) => toLab(meanColour(shot.data, shot.width, column, 4, tileSize, bar))[0] - toLab(meanColour(shot.data, shot.width, column, 4, tileSize, slot))[0]
      slots.push(contrast(after) / Math.max(0.001, contrast(before)))
    }

    checks.push({thing: 'pit', name: 'Pit’s bottom lightened by', value: Math.max(0, worst(darkness, Math.max)), unit: 'L*', good: 2, fair: 4, note: 'A pit must stay a hole: how much lighter its middle got, worst tile.'})
    checks.push({thing: 'pit', name: 'Lit rim kept', value: 100 * worst(rims, Math.min), unit: '%', good: 85, fair: 70, higher: true, note: 'The rim’s brightness left, along a tile’s top and bottom, worst tile.'})
    checks.push({thing: 'grate', name: 'Slots against bars kept', value: 100 * worst(slots, Math.min), unit: '%', good: 85, fair: 70, higher: true, note: 'How much the grate still reads as slots in a plate, worst grate.'})
  }

  for (const check of checks) {
    const value = check.value
    check.verdict = check.higher ? ((value >= check.good) ? 'good' : (value >= check.fair) ? 'fair' : 'poor') : ((value <= check.good) ? 'good' : (value <= check.fair) ? 'fair' : 'poor')
  }

  return checks
}
