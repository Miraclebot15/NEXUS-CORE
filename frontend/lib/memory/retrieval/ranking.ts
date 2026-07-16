import type { MemoryEntry } from "../types"

export function calculateMemoryScore(
  memory: MemoryEntry
): number {

  let score = memory.confidence

  switch (memory.importance) {
    case "critical":
      score += 5
      break
    case "high":
      score += 3
      break
    case "medium":
      score += 2
      break
    case "low":
      score += 1
      break
  }

  return score

}

export function rankMemories(
  memories: MemoryEntry[]
): MemoryEntry[] {

  return [...memories].sort(
    (a, b) =>
      calculateMemoryScore(b) -
      calculateMemoryScore(a)
  )

}
