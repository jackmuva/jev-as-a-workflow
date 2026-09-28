import type { SelectOption } from "@opentui/core"
import type { CompletionItem } from "../../lib/input-completion/types"

type InputCompletionMenuProps = {
  items: CompletionItem[]
  selectedIndex: number
}

const MAX_VISIBLE_ITEMS = 6

export const InputCompletionMenu = ({ items, selectedIndex }: InputCompletionMenuProps) => {
  const options: SelectOption[] = items.map((item) => ({
    name: item.label,
    description: item.description ?? "",
    value: item.id,
  }))

  return (
    <box flexDirection="column" marginBottom={1} width="100%">
      <text fg="#565f89">Tab/Enter to accept · Esc to dismiss</text>
      <select
        options={options}
        selectedIndex={selectedIndex}
        showDescription={true}
        showSelectionIndicator={true}
        height={Math.min(MAX_VISIBLE_ITEMS, Math.max(1, options.length))}
        width="100%"
        focused={false}
      />
    </box>
  )
}
