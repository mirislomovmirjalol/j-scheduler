import { existsSync } from "node:fs"
import { join } from "node:path"

const EXTENSIONS = ["svg", "jpg", "jpeg", "png", "webp", "avif"]

// Server-only: looks for a real file in public/images/<name>.<ext>. Photo
// slots are wired once against a name — dropping a matching file into
// public/images later flips the slot from placeholder to real photo with
// no code change.
export function getImagePath(name: string): string | null {
  for (const ext of EXTENSIONS) {
    const relative = `images/${name}.${ext}`
    if (existsSync(join(process.cwd(), "public", relative))) {
      return `/${relative}`
    }
  }
  return null
}
