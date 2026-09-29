import type { ChoiceProbabilities as Probabilities } from "../../../models/agent"

const MAX_CHOICES = 5
const MUTED_FG = "#565f89"
const SELECTED_FG = "#9ece6a"

type ChoiceProbabilitiesProps = {
  probabilities: Probabilities
  selected: string
}

export const ChoiceProbabilities = ({ probabilities, selected }: ChoiceProbabilitiesProps) => {
  const ranked = Object.entries(probabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_CHOICES)

  return (
    <box width="75%">
      <text>
        {ranked.map(([choice, probability], index) => (
          <span key={choice} fg={choice === selected ? SELECTED_FG : MUTED_FG}>
            {`${index > 0 ? "  ·  " : ""}${(probability * 100).toFixed(1)}% ${choice}`}
          </span>
        ))}
      </text>
    </box>
  )
}
