export async function register() {
  // Only run the event logger on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEventLogger } = await import("./lib/event-logger");
    startEventLogger();
  }
}
