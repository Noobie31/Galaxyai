import { defineConfig } from "@trigger.dev/sdk/v3"

export default defineConfig({
  project: "proj_qxlbslbjcpdltbhtznik",
  maxDuration: 300,
  dirs: ["./src/trigger"],
  build: {
    external: ["ffmpeg-static", "ffprobe-static"],
  },
})