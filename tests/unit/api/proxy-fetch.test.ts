/**
 * @jest-environment node
 */
import { POST } from "@/app/api/proxy-fetch/route"
import { NextRequest } from "next/server"

global.fetch = jest.fn()

const mockFetch = fetch as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/proxy-fetch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/proxy-fetch", () => {
  describe("successful requests", () => {
    it("fetches the URL and returns html", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "<html><body>Hello</body></html>",
      })
      const req = makeRequest({ url: "https://example.com" })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.html).toBe("<html><body>Hello</body></html>")
    })

    it("works with http:// URLs", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "<p>ok</p>" })
      const req = makeRequest({ url: "http://example.com/page" })
      const res = await POST(req)
      expect(res.status).toBe(200)
    })
  })

  describe("input validation", () => {
    it("returns 400 when url is missing", async () => {
      const req = makeRequest({})
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/invalid url/i)
    })

    it("returns 400 when url is not a string", async () => {
      const req = makeRequest({ url: 12345 })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it("returns 400 for a malformed URL", async () => {
      const req = makeRequest({ url: "not-a-valid-url" })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/invalid url format/i)
    })

    it("returns 400 for a non-HTTP/HTTPS protocol", async () => {
      const req = makeRequest({ url: "ftp://example.com" })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/only http/i)
    })

    it("returns 400 for a javascript: protocol", async () => {
      const req = makeRequest({ url: "javascript:alert(1)" })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  describe("upstream errors", () => {
    it("returns the upstream status code when the remote fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
      const req = makeRequest({ url: "https://example.com/missing" })
      const res = await POST(req)
      expect(res.status).toBe(404)
    })

    it("returns 500 when fetch throws a network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))
      const req = makeRequest({ url: "https://example.com" })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toContain("Network error")
    })
  })
})
