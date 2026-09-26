import { useEffect, useState } from "react"

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const

export const WorkingIndicator = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((current) => (current + 1) % SPINNER_FRAMES.length)
    }, 80)
    return () => clearInterval(id)
  }, [])

  return <text>{SPINNER_FRAMES[frame]} WORKING</text>
}
