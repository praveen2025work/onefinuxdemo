// Shell-wide requests any screen can make without prop drilling: open the assistant (optionally with a question),
// open the feedback dialog. The Layout listens and owns the panels.
export function openAssistant(question) {
  window.dispatchEvent(new CustomEvent('ofx-assist', { detail: { question } }));
}

export function openFeedback(category) {
  window.dispatchEvent(new CustomEvent('ofx-feedback', { detail: { category } }));
}
