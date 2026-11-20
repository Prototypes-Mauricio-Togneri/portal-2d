// ============================================================
// Detail layers: everything drawn over the floor and the walls.
// Each is chosen from the tile's position and one seed, so a
// chamber always comes out the same.
// ============================================================

const Engine = window.ChamberEngine
const SUB = 8 // Samples per tile, each way, of the soft layers (patches, light, grime)
const BEVEL = 0.2 // A wall's sloped edge, as a share of a tile, with its lit lip

/** A number from 0 to 1 that depends only on the seed, a tile and a salt. */
function hash(seed, x, y, salt) {
  let h = Math.imul(seed | 0, 0x9E3779B1) ^ Math.imul(x | 0, 0x85EBCA77) ^ Math.imul(y | 0, 0xC2B2AE3D) ^ Math.imul(salt | 0, 0x27D4EB2F)
  h ^= h >>> 15
  h = Math.imul(h, 0x2C1B3C6D)
  h ^= h >>> 12
  h = Math.imul(h, 0x297A2D39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** A stream of numbers from 0 to 1 for one tile. */
function randomFrom(seed, x, y, salt) {
  let a = Math.floor(hash(seed, x, y, salt) * 4294967296) >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
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
  return `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${Math.max(0, alpha).toFixed(3)})`
}

function mix(a, b, share) {
  return [
    Math.round(a[0] + ((b[0] - a[0]) * share)),
    Math.round(a[1] + ((b[1] - a[1]) * share)),
    Math.round(a[2] + ((b[2] - a[2]) * share)),
  ]
}

const chamberInfos = new Map()

/** What the layers need to know about a chamber: its tiles, and how far each spot of floor lies from a wall. */
function chamberInfo(index) {
  let info = chamberInfos.get(index)

  if (info !== undefined) {
    return info
  }

  const grid = Engine.grid(index)
  const W = grid.width
  const H = grid.height
  const cellAt = (c, r) => ((c < 0) || (r < 0) || (c >= W) || (r >= H)) ? undefined : grid.cells[(r * W) + c]
  const wall = (c, r) => cellAt(c, r)?.wall === true
  const has = (c, r, kind) => cellAt(c, r)?.kinds.includes(kind) === true
  const distance = new Float32Array(W * SUB * H * SUB)
  const reach = 3

  for (let j = 0; j < H * SUB; j++) {
    for (let i = 0; i < W * SUB; i++) {
      const u = (i + 0.5) / SUB
      const v = (j + 0.5) / SUB
      const c = Math.floor(u)
      const r = Math.floor(v)
      let nearest = reach

      if (wall(c, r)) {
        nearest = 0
      } else {
        for (let rr = r - reach; rr <= r + reach; rr++) {
          for (let cc = c - reach; cc <= c + reach; cc++) {
            if (wall(cc, rr)) {
              const dx = Math.max(cc - u, 0, u - (cc + 1))
              const dy = Math.max(rr - v, 0, v - (rr + 1))
              nearest = Math.min(nearest, Math.hypot(dx, dy))
            }
          }
        }
      }

      distance[(j * W * SUB) + i] = nearest
    }
  }

  info = {
    index: index,
    W: W,
    H: H,
    cellAt: cellAt,
    wall: wall,
    has: has,
    distance: distance,
  }
  chamberInfos.set(index, info)

  return info
}

/** Paints a soft layer at a few samples per tile; drawn stretched over the chamber, it comes out smooth. */
function softLayer(info, paint) {
  const width = info.W * SUB
  const height = info.H * SUB
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(width, height)
  const out = [0, 0, 0, 0]

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const at = (j * width) + i
      paint((i + 0.5) / SUB, (j + 0.5) / SUB, info.distance[at], out)
      image.data[at * 4] = out[0]
      image.data[(at * 4) + 1] = out[1]
      image.data[(at * 4) + 2] = out[2]
      image.data[(at * 4) + 3] = Math.round(clamp01(out[3]) * 255)
    }
  }

  ctx.putImageData(image, 0, 0)

  return canvas
}

function drawSoftLayer(ctx, T, info, layer) {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(layer, 0, 0, info.W * T, info.H * T)
}

// ---------- Wear marks, each drawn in a tile's own frame ----------

function drawScuff(ctx, T, random, strength, onWall) {
  const colour = onWall ? [18, 20, 26] : [40, 44, 58]
  const count = 1 + Math.floor(random() * 3)
  const length = (0.3 + (0.4 * random())) * T
  const bend = (random() - 0.5) * 0.2 * T
  const gap = (0.07 + (0.04 * random())) * T

  ctx.save()
  ctx.translate((0.2 + (0.6 * random())) * T, (0.2 + (0.6 * random())) * T)
  ctx.rotate(random() * Math.PI)
  ctx.lineCap = 'round'

  for (let i = 0; i < count; i++) {
    const offset = (i - ((count - 1) / 2)) * gap
    const own = length * (0.55 + (0.45 * random()))
    const start = (-own / 2) + ((random() - 0.5) * 0.2 * T)

    ctx.beginPath()
    ctx.moveTo(start, offset)
    ctx.quadraticCurveTo(start + (own / 2), offset + bend, start + own, offset)
    for (const [width, alpha] of [[0.085, 0.035], [0.055, 0.045], [0.028, 0.05]]) {
      ctx.strokeStyle = rgba(colour, alpha * strength)
      ctx.lineWidth = Math.max(1, width * T)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawScratches(ctx, T, random, strength, onWall) {
  // One scrape: a few near-parallel lines close together, as from something dragged
  const count = 2 + Math.floor(random() * 3)
  const angle = random() * Math.PI
  const width = Math.max(1, T * 0.009)
  const cut = onWall ? [238, 241, 248, 0.3 * strength] : [58, 64, 82, 0.24 * strength]
  const edge = onWall ? [0, 0, 0, 0.2 * strength] : [255, 255, 255, 0.55 * strength]
  const gap = (0.035 + (0.04 * random())) * T

  ctx.save()
  ctx.translate((0.25 + (0.5 * random())) * T, (0.25 + (0.5 * random())) * T)
  ctx.rotate(angle)
  ctx.lineCap = 'butt'
  ctx.lineWidth = width

  for (let i = 0; i < count; i++) {
    const y = ((i - ((count - 1) / 2)) * gap) + ((random() - 0.5) * gap * 0.5)
    const half = (0.16 + (0.3 * random())) * T
    const middle = (random() - 0.5) * 0.25 * T
    const tilt = (random() - 0.5) * 0.035 * T

    for (const [colour, shift] of [[edge, width], [cut, 0]]) {
      // Faint at both ends, as a scratch trails off
      const fade = ctx.createLinearGradient(middle - half, 0, middle + half, 0)

      fade.addColorStop(0, rgba(colour, 0))
      fade.addColorStop(0.25, rgba(colour, colour[3]))
      fade.addColorStop(0.7, rgba(colour, colour[3]))
      fade.addColorStop(1, rgba(colour, 0))
      ctx.strokeStyle = fade
      ctx.beginPath()
      ctx.moveTo(middle - half, y + shift - tilt)
      ctx.lineTo(middle + half, y + shift + tilt)
      ctx.stroke()
    }
  }

  ctx.restore()
}

/** A stain's shape: a few blobs run together, darker along its rim, as a dried puddle is. */
function makeStain(random, colour) {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(size, size)
  const blobs = []
  const count = 3 + Math.floor(random() * 4)
  const salt = Math.floor(random() * 100000)

  for (let i = 0; i < count; i++) {
    blobs.push({
      x: 0.5 + ((random() - 0.5) * 0.4),
      y: 0.5 + ((random() - 0.5) * 0.4),
      spread: 0.08 + (random() * 0.09),
    })
  }

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size
      const y = (j + 0.5) / size
      let field = (valueNoise(1, x * 7, y * 7, salt) - 0.5) * 0.4

      for (const blob of blobs) {
        field += Math.exp(-(((x - blob.x) ** 2) + ((y - blob.y) ** 2)) / (2 * blob.spread * blob.spread))
      }

      const inside = smooth(0.32, 1.0, field)
      const rim = smooth(0.32, 0.6, field) * (1 - smooth(0.6, 1.0, field))
      const border = smooth(0, 0.1, Math.min(x, y, 1 - x, 1 - y))
      const at = ((j * size) + i) * 4

      image.data[at] = colour[0]
      image.data[at + 1] = colour[1]
      image.data[at + 2] = colour[2]
      image.data[at + 3] = Math.round(((0.7 * inside) + (0.3 * rim)) * border * 255)
    }
  }

  ctx.putImageData(image, 0, 0)

  return canvas
}

function drawStain(ctx, T, random, strength, onWall) {
  const colour = onWall ? ((random() < 0.5) ? [20, 22, 30] : [232, 236, 244]) : mix([66, 74, 92], [104, 90, 72], random())
  const stain = makeStain(random, colour)
  const side = (0.8 + (1.0 * random())) * T

  ctx.save()
  ctx.translate((0.2 + (0.6 * random())) * T, (0.2 + (0.6 * random())) * T)
  ctx.rotate(random() * Math.PI * 2)
  ctx.globalAlpha = Math.min(1, (onWall ? 0.11 : 0.16) * strength)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(stain, -side / 2, -side / 2, side, side)
  ctx.restore()
}

function drawCrack(ctx, T, random, strength) {
  const side = Math.floor(random() * 4)
  const along = (0.15 + (0.7 * random())) * T
  const width = Math.max(1, T * 0.013)
  let x = [along, T, along, 0][side]
  let y = [0, along, T, along][side]
  let heading = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side] + ((random() - 0.5) * 1.0)
  const points = [[x, y]]
  const steps = 5 + Math.floor(random() * 4)

  for (let i = 0; i < steps; i++) {
    heading += (random() - 0.5) * 0.9
    const length = (0.06 + (0.09 * random())) * T
    x += Math.cos(heading) * length
    y += Math.sin(heading) * length
    points.push([x, y])
  }

  const fork = points[2 + Math.floor(random() * 2)]
  let forkHeading = heading + (((random() < 0.5) ? -1 : 1) * (0.7 + (0.5 * random())))
  const branch = [fork]

  for (let i = 0; i < 3; i++) {
    forkHeading += (random() - 0.5) * 0.8
    const length = (0.05 + (0.06 * random())) * T
    const last = branch[branch.length - 1]
    branch.push([last[0] + (Math.cos(forkHeading) * length), last[1] + (Math.sin(forkHeading) * length)])
  }

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = width

  for (const [line, shift, colour] of [
    [points, width, rgba([255, 255, 255], 0.55 * strength)],
    [branch, width, rgba([255, 255, 255], 0.4 * strength)],
    [points, 0, rgba([34, 38, 50], 0.6 * strength)],
    [branch, 0, rgba([34, 38, 50], 0.45 * strength)],
  ]) {
    ctx.strokeStyle = colour
    ctx.beginPath()
    line.forEach((point, i) => (i === 0) ? ctx.moveTo(point[0] + shift, point[1] + shift) : ctx.lineTo(point[0] + shift, point[1] + shift))
    ctx.stroke()
  }

  ctx.restore()
}

function drawChip(ctx, T, random, strength) {
  const a = (0.08 + (0.1 * random())) * T
  const b = (0.08 + (0.1 * random())) * T

  ctx.save()
  ctx.translate(T / 2, T / 2)
  ctx.rotate(Math.floor(random() * 4) * Math.PI / 2)
  ctx.translate(-T / 2, -T / 2)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(a, 0)
  ctx.lineTo(a * (0.62 + (0.12 * random())), b * (0.2 + (0.12 * random())))
  ctx.lineTo(a * (0.4 + (0.1 * random())), b * (0.42 + (0.14 * random())))
  ctx.lineTo(a * (0.16 + (0.1 * random())), b * (0.7 + (0.12 * random())))
  ctx.lineTo(0, b)
  ctx.closePath()
  ctx.fillStyle = rgba([122, 127, 140], 0.6 * strength)
  ctx.fill()
  ctx.strokeStyle = rgba([52, 57, 70], 0.4 * strength)
  ctx.lineWidth = Math.max(1, T * 0.008)
  ctx.stroke()
  ctx.restore()
}

const MARK_DRAWINGS = {
  scuffs: drawScuff,
  scratches: drawScratches,
  stains: drawStain,
  cracks: drawCrack,
  chips: drawChip,
}

/** Marks that belong to their own tile; a scuff, a scrape or a stain may run on over the next. */
const KEPT_IN_TILE = new Set(['cracks', 'chips'])

/** Bottom to top: stains lie under everything scraped or broken later. */
const MARK_ORDER = ['stains', 'scuffs', 'scratches', 'cracks', 'chips']

/** The kinds of wear switched on in a group, in the order they are drawn. */
function wearLayers(group, on) {
  return TECHNIQUES.filter((technique) => (technique.group === group) && on[technique.id]).sort((a, b) => MARK_ORDER.indexOf(a.mark) - MARK_ORDER.indexOf(b.mark))
}

/** A number of its own for each kind of wear, so each lands on tiles of its own. */
function saltOf(technique) {
  return 100 + (TECHNIQUES.indexOf(technique) * 2)
}

/** Tiles whose floor is busy or hidden, where a wear mark would only confuse. */
const NO_WEAR_ON = ['ditch', 'button', 'switch', 'arrow', 'slideFloor', 'door', 'exit']

// ---------- The floor ----------

function floorHook(info, settings) {
  const seed = settings.seed
  const on = settings.on
  const amount = (id) => settings.amount[id] / 100

  return (ctx, T) => {
    if (on.floorShade) {
      const most = amount('floorShade') * 0.13

      for (let r = 0; r < info.H; r++) {
        for (let c = 0; c < info.W; c++) {
          if (info.wall(c, r)) {
            continue
          }

          // Most tiles land near the middle shade; one in fourteen is clearly off, like a panel replaced later
          const bell = (hash(seed, c, r, 11) + hash(seed, c, r, 12) + hash(seed, c, r, 13)) / 3
          const odd = hash(seed, c, r, 14) < 0.07
          const dark = most * (odd ? 1.15 + (0.5 * hash(seed, c, r, 16)) : clamp01((bell - 0.2) / 0.6))

          ctx.fillStyle = rgba(mix([26, 36, 62], [66, 56, 42], hash(seed, c, r, 15)), dark)
          ctx.fillRect(c * T, r * T, T, T)
        }
      }
    }

    if (on.floorPatches) {
      const most = amount('floorPatches') * 0.14

      drawSoftLayer(ctx, T, info, softLayer(info, (u, v, _distance, out) => {
        out[0] = 34
        out[1] = 40
        out[2] = 60
        out[3] = most * smooth(0.3, 1, clouds(seed, u / 4.2, v / 4.2, 21))
      }))
    }

    if (on.roomLight) {
      const most = amount('roomLight') * 0.22

      drawSoftLayer(ctx, T, info, softLayer(info, (_u, _v, distance, out) => {
        out[0] = 20
        out[1] = 26
        out[2] = 44
        out[3] = most * Math.exp(-distance / 0.85)
      }))
      // The open floor, away from every wall, is lifted towards white
      drawSoftLayer(ctx, T, info, softLayer(info, (_u, _v, distance, out) => {
        out[0] = 255
        out[1] = 255
        out[2] = 255
        out[3] = most * 2.2 * smooth(1.1, 2.6, distance)
      }))
    }

    if (on.grime) {
      const most = amount('grime') * 0.3

      drawSoftLayer(ctx, T, info, softLayer(info, (u, v, distance, out) => {
        const patchy = clouds(seed, u * 0.9, v * 0.9, 31)

        out[0] = 60
        out[1] = 54
        out[2] = 46
        out[3] = most * (1 - smooth(0.02, 0.4, distance)) * (0.35 + (0.65 * patchy))
      }))
    }

    for (const technique of wearLayers('floorWear', on)) {
      const share = settings.density[technique.id] / 100
      const strength = amount(technique.id) * 1.6
      const salt = saltOf(technique)
      const draw = MARK_DRAWINGS[technique.mark]

      for (let r = 0; r < info.H; r++) {
        for (let c = 0; c < info.W; c++) {
          const cell = info.cellAt(c, r)

          if (cell.wall || NO_WEAR_ON.some((kind) => cell.kinds.includes(kind)) || (hash(seed, c, r, salt) >= share)) {
            continue
          }

          ctx.save()
          ctx.translate(c * T, r * T)

          if (KEPT_IN_TILE.has(technique.mark)) {
            ctx.beginPath()
            ctx.rect(0, 0, T, T)
            ctx.clip()
          }

          draw(ctx, T, randomFrom(seed, c, r, salt + 1), strength, false)
          ctx.restore()
        }
      }
    }
  }
}

// ---------- The walls ----------

/** A plain wall tile: not a blocked wall's steel. */
function plainWall(info, c, r) {
  const cell = info.cellAt(c, r)
  return (cell !== undefined) && cell.wall && !cell.steel
}

/** The flat tops of the walls, inside their sloped edges, as one shape to clip to. */
function wallTops(info, T) {
  const path = new Path2D()
  const bevel = Math.round(T * BEVEL)

  for (let r = 0; r < info.H; r++) {
    for (let c = 0; c < info.W; c++) {
      if (!plainWall(info, c, r)) {
        continue
      }

      const xs = [c * T, (c * T) + bevel, ((c + 1) * T) - bevel, (c + 1) * T]
      const ys = [r * T, (r * T) + bevel, ((r + 1) * T) - bevel, (r + 1) * T]

      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const dc = i - 1
          const dr = j - 1
          // The middle is always flat; a side only where a wall continues there; a corner only where walls fill all three tiles round it
          const flat = ((dc === 0) || info.wall(c + dc, r)) && ((dr === 0) || info.wall(c, r + dr)) && ((dc === 0) || (dr === 0) || info.wall(c + dc, r + dr))

          if (flat) {
            path.rect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j])
          }
        }
      }
    }
  }

  return path
}

function wallHook(info, settings) {
  const seed = settings.seed
  const on = settings.on
  const amount = (id) => settings.amount[id] / 100

  return (ctx, T) => {
    ctx.save()
    // Only where a wall is already drawn, so the walls keep their shape and their shadow
    ctx.globalCompositeOperation = 'source-atop'

    if (on.wallPatches) {
      const most = amount('wallPatches') * 0.16

      drawSoftLayer(ctx, T, info, softLayer(info, (u, v, _distance, out) => {
        const level = clouds(seed, u / 3.6, v / 3.6, 51)
        const lighter = level > 0.5

        out[0] = lighter ? 255 : 0
        out[1] = lighter ? 255 : 0
        out[2] = lighter ? 255 : 0
        out[3] = most * Math.abs(level - 0.5) * 2 * (lighter ? 0.75 : 1)
      }))
    }

    ctx.clip(wallTops(info, T))

    if (on.wallShade) {
      for (let r = 0; r < info.H; r++) {
        for (let c = 0; c < info.W; c++) {
          if (plainWall(info, c, r)) {
            const bell = ((hash(seed, c, r, 61) + hash(seed, c, r, 62) + hash(seed, c, r, 63)) / 3) - 0.5
            const shift = clamp01(Math.abs(bell) / 0.3) * amount('wallShade') * 0.2

            ctx.fillStyle = (bell > 0) ? rgba([255, 255, 255], shift * 0.8) : rgba([0, 0, 0], shift)
            ctx.fillRect(c * T, r * T, T, T)
          }
        }
      }
    }

    for (const technique of wearLayers('wallWear', on)) {
      const share = settings.density[technique.id] / 100
      const strength = amount(technique.id) * 1.6
      const salt = saltOf(technique)
      const draw = MARK_DRAWINGS[technique.mark]

      for (let r = 0; r < info.H; r++) {
        for (let c = 0; c < info.W; c++) {
          if (plainWall(info, c, r) && (hash(seed, c, r, salt) < share)) {
            ctx.save()
            ctx.translate(c * T, r * T)
            draw(ctx, T, randomFrom(seed, c, r, salt + 1), strength, true)
            ctx.restore()
          }
        }
      }
    }

    ctx.restore()
  }
}

/**
 * Draws a chamber as the game does, with the detail layers the settings switch on.
 * The game now draws its own surface detail, the one chosen with this very mixer, so it is switched
 * off here: "Original" stays the floor and the walls as they were, and the layers are the mock-up's own.
 */
function drawChamber(canvas, index, tileSize, settings) {
  if (settings === null) {
    Engine.render(canvas, index, tileSize, {surfaceDetail: false})

    return
  }

  const info = chamberInfo(index)

  Engine.render(canvas, index, tileSize, {
    surfaceDetail: false,
    hooks: {
      floor: floorHook(info, settings),
      walls: wallHook(info, settings),
    },
  })
}
