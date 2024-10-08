import type { FormatType, Pastebin } from "pastedeno"

let pastebin: Pastebin | undefined

if (
  process.env.PASTEBIN_API_DEV_KEY &&
  process.env.PASTEBIN_API_USERNAME &&
  process.env.PASTEBIN_API_DEV_KEY
) {
  ;(async () => {
    const { Pastebin } = await import("pastedeno")
    pastebin = new Pastebin({
      api_dev_key: process.env.PASTEBIN_API_DEV_KEY!,
      api_user_name: process.env.PASTEBIN_API_USERNAME!,
      api_user_password: process.env.PASTEBIN_API_PASSWORD!
    })
  })()
}

export const pastebinService = {
  async createPaste(title: string, text: string, format: FormatType = "json") {
    return pastebin?.createPaste({
      text,
      title,
      format
    })
  },

  getPaste(id: string, raw: boolean) {
    return pastebin?.getPaste(id, raw)
  }
}
