import { cn, getISOWeekInfo, getISOWeekKey } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz")
  })

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500")
    expect(cn("p-4", "p-2")).toBe("p-2")
    expect(cn("text-sm", "text-lg")).toBe("text-lg")
  })

  it("handles empty and falsy inputs", () => {
    expect(cn()).toBe("")
    expect(cn("")).toBe("")
    expect(cn(null as unknown as string, undefined as unknown as string)).toBe("")
    expect(cn(false as unknown as string)).toBe("")
  })

  it("handles arrays and objects", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
    expect(cn({ foo: true, bar: false })).toBe("foo")
    expect(cn({ foo: true, bar: true })).toBe("foo bar")
  })
})

describe("getISOWeekInfo", () => {
  it("returns correct week number for a mid-year date", () => {
    // 2024-06-17 is Monday of week 25
    const info = getISOWeekInfo(new Date("2024-06-17"))
    expect(info.weekNumber).toBe(25)
    expect(info.year).toBe(2024)
  })

  it("returns Monday as startOfWeek", () => {
    // 2024-06-19 is Wednesday
    const info = getISOWeekInfo(new Date("2024-06-19"))
    const start = info.startOfWeek
    expect(start.getDay()).toBe(1) // Monday
  })

  it("returns Sunday as endOfWeek", () => {
    // 2024-06-19 is Wednesday
    const info = getISOWeekInfo(new Date("2024-06-19"))
    const end = info.endOfWeek
    expect(end.getDay()).toBe(0) // Sunday
  })

  it("startOfWeek is always Monday of the same week", () => {
    // 2024-06-17 (Mon) through 2024-06-23 (Sun) should all yield the same week
    for (let d = 17; d <= 23; d++) {
      const info = getISOWeekInfo(new Date(`2024-06-${d}`))
      expect(info.startOfWeek.getDate()).toBe(17)
      expect(info.weekNumber).toBe(25)
    }
  })

  it("handles ISO week year boundary – Jan 1 2021 belongs to week 53 of 2020", () => {
    // 2021-01-01 is a Friday; ISO week year is 2020, week 53
    const info = getISOWeekInfo(new Date("2021-01-01"))
    expect(info.weekNumber).toBe(53)
    expect(info.year).toBe(2020)
  })

  it("handles ISO week year boundary – Dec 31 2020 belongs to week 53 of 2020", () => {
    const info = getISOWeekInfo(new Date("2020-12-31"))
    expect(info.weekNumber).toBe(53)
    expect(info.year).toBe(2020)
  })

  it("handles Jan 4 which is always in ISO week 1 of its calendar year", () => {
    // Jan 4 is always in week 1 of the calendar year it belongs to
    const info = getISOWeekInfo(new Date("2024-01-04"))
    expect(info.weekNumber).toBe(1)
    expect(info.year).toBe(2024)
  })

  it("handles a date where ISO year differs from calendar year (late December)", () => {
    // 2019-12-30 is Monday, ISO week 1 of 2020
    const info = getISOWeekInfo(new Date("2019-12-30"))
    expect(info.weekNumber).toBe(1)
    expect(info.year).toBe(2020)
  })

  it("startOfWeek begins at midnight and endOfWeek ends just before midnight (23:59:59.999)", () => {
    const info = getISOWeekInfo(new Date("2024-06-19"))
    expect(info.startOfWeek.getHours()).toBe(0)
    expect(info.startOfWeek.getMinutes()).toBe(0)
    expect(info.startOfWeek.getSeconds()).toBe(0)
    expect(info.endOfWeek.getHours()).toBe(23)
    expect(info.endOfWeek.getMinutes()).toBe(59)
    expect(info.endOfWeek.getSeconds()).toBe(59)
  })
})

describe("getISOWeekKey", () => {
  it("formats key as YYYY-Www with zero-padded week", () => {
    // 2024-06-17 is week 25 of 2024
    expect(getISOWeekKey(new Date("2024-06-17"))).toBe("2024-W25")
  })

  it("zero-pads single-digit week numbers", () => {
    // 2024-01-04 is week 1 of 2024
    expect(getISOWeekKey(new Date("2024-01-04"))).toBe("2024-W01")
  })

  it("uses ISO year, not calendar year", () => {
    // 2021-01-01 belongs to week 53 of ISO year 2020
    expect(getISOWeekKey(new Date("2021-01-01"))).toBe("2020-W53")
  })

  it("handles week 52", () => {
    // 2024-12-23 is week 52 of 2024
    expect(getISOWeekKey(new Date("2024-12-23"))).toBe("2024-W52")
  })

  it("produces distinct keys for adjacent weeks", () => {
    const key1 = getISOWeekKey(new Date("2024-06-17")) // W25
    const key2 = getISOWeekKey(new Date("2024-06-24")) // W26
    expect(key1).not.toBe(key2)
  })
})
