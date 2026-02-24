import { defineConfig } from "@trigger.dev/sdk/v3"

export default defineConfig({
  project: "proj_qxlbslbjcpdltbhtznik",
  maxDuration: 300,
  dirs: ["./src/trigger"],
  build: {
    external: [
      "ffmpeg-static",
      "ffprobe-static",
      "fluent-ffmpeg",
      "sharp",
    ],
    additionalFiles: [
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/ffprobe-static/bin/linux/x64/ffprobe",
      "./node_modules/ffprobe-static/bin/linux/ia32/ffprobe",
      "./node_modules/ffprobe-static/bin/darwin/x64/ffprobe",
      "./node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe",
    ],
  },
})