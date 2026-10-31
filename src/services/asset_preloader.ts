/**
 * Downloads every audio and image file in src/assets before the first screen opens.
 * Each audio file is handed to the game's players as a copy in memory: their own
 * requests ask the host for a different encoding, so they would miss the browser
 * cache and download the file again. Images are drawn from CSS, which reads the
 * browser cache these downloads fill. The host keeps the files cached for a year
 * (firebase.json), so later visits read them from disk. A file that fails is
 * skipped and loads on demand later, as it would without the preload.
 */
import {useAudioFile} from '@/game/audio_sources'

/** One file being downloaded. */
interface FileDownload {
  url: string // Address of the file
  size: number | null // Size the server announced; null until it answers, or when it doesn't say
  received: number // Bytes downloaded so far
  answered: boolean // True once the server has answered or the request has failed
  finished: boolean // True once the file has downloaded or failed
}

// Every audio and image file, found at build time, so a new asset is preloaded without a list to update
const AUDIO_URLS = Object.values(import.meta.glob<string>('@/assets/audio/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
}))
const IMAGE_URLS = Object.values(import.meta.glob<string>('@/assets/images/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
}))

// The font faces index.html requests from Google Fonts; keep the two in step
const FONT_FACES = [
  '500 1rem "Barlow Condensed"',
  '600 1rem "Barlow Condensed"',
  '700 1rem "Barlow Condensed"',
  'italic 700 1rem "Barlow Condensed"',
  '400 1rem "Barlow"',
  '500 1rem "Barlow"',
  '600 1rem "Barlow"',
]

/**
 * Works out how much of the preload is done. Stays at 0 until every server has
 * answered, so the total is known up front and the share never moves backwards.
 * @param downloads - Every file being downloaded
 * @returns Share downloaded, from 0 to 1
 */
function downloadedShare(downloads: FileDownload[]): number {
  if (downloads.some((download) => !download.answered)) {
    return 0
  }

  let done = 0
  let total = 0
  for (const download of downloads) {
    if (download.finished) {
      const size = download.size ?? download.received
      done += size
      total += size
    } else if (download.size !== null) {
      // A file of unknown size counts only once it has finished
      done += Math.min(download.received, download.size)
      total += download.size
    }
  }

  return total === 0 ? 0 : done / total
}

/**
 * Starts tracking a file that is about to be downloaded.
 * @param url - Address of the file
 * @returns The file's download, with nothing received yet
 */
function createDownload(url: string): FileDownload {
  return {
    url: url,
    size: null,
    received: 0,
    answered: false,
    finished: false,
  }
}

/**
 * Downloads one file to the end, so the browser cache holds all of it.
 * Never rejects: a file that fails is marked finished and left to load on demand.
 * @param download - The file to download, updated as it arrives
 * @param report - Called whenever the download moves forward
 * @returns The whole file, or null if it failed
 */
async function downloadFile(download: FileDownload, report: () => void): Promise<Blob | null> {
  let file: Blob | null = null
  try {
    const response = await fetch(download.url)
    if (response.ok && response.body !== null) {
      const length = Number(response.headers.get('Content-Length'))
      download.size = length > 0 ? length : null
      download.answered = true
      report()

      const reader = response.body.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let chunk = await reader.read()
      while (!chunk.done) {
        chunks.push(chunk.value)
        download.received += chunk.value.byteLength
        report()
        chunk = await reader.read()
      }
      file = new Blob(chunks, {
        type: response.headers.get('Content-Type') ?? '',
      })
    }
  } catch (_error) {
    // Offline or blocked: the file loads on demand later
  }

  download.answered = true
  download.finished = true
  report()
  return file
}

/**
 * Downloads one audio file and hands the game's players a copy of it in memory.
 * A file that fails leaves its players to fetch it when they first play.
 * @param download - The file to download, updated as it arrives
 * @param report - Called whenever the download moves forward
 */
async function preloadAudio(download: FileDownload, report: () => void): Promise<void> {
  const file = await downloadFile(download, report)
  if (file !== null) {
    useAudioFile(download.url, URL.createObjectURL(file))
  }
}

/**
 * Loads one font face. Never rejects: a face that fails leaves the page on the next font in its stack.
 * @param face - CSS font shorthand naming the face
 */
async function loadFont(face: string): Promise<void> {
  try {
    await document.fonts.load(face)
  } catch (_error) {
    // The next font in the stack stands in
  }
}

/**
 * Downloads every asset and loads the fonts. Resolves once each one has loaded
 * or failed; never rejects.
 * @param onProgress - Called with the share of the assets downloaded so far, from 0 to 1
 */
export async function preloadAssets(onProgress: (share: number) => void): Promise<void> {
  const audioDownloads = AUDIO_URLS.map(createDownload)
  const imageDownloads = IMAGE_URLS.map(createDownload)
  const downloads = [
    ...audioDownloads,
    ...imageDownloads,
  ]

  /**
   * Passes the current share to the caller.
   */
  const report = (): void => {
    onProgress(downloadedShare(downloads))
  }

  await Promise.all([
    ...audioDownloads.map((download) => preloadAudio(download, report)),
    ...imageDownloads.map((download) => downloadFile(download, report)),
    ...FONT_FACES.map((face) => loadFont(face)),
  ])
}
