export const EDGE_FG = "#3b4261"

// Vertical connector drawn above a node so consecutive nodes read as one flow.
export const WorkflowEdge = () => (
  <text fg={EDGE_FG} selectable={false}>{"  │"}</text>
)
