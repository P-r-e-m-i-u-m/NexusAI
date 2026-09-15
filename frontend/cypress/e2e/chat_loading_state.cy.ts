/**
 * Regression coverage for issue #20 — "Chat hangs with no loading indicator
 * after sending message".
 *
 * Every test stubs POST /api/v1/llm/chat, so the suite needs neither a running
 * backend nor an LLM API key.
 */

const CHAT_ENDPOINT = "**/api/v1/llm/chat";

/** Builds an SSE body in the shape the backend's event_gen() emits. */
const sseBody = (...tokens: string[]) =>
  tokens.map((t) => `data: ${JSON.stringify({ content: t })}\n\n`).join("") +
  "data: [DONE]\n\n";

const sseHeaders = { "content-type": "text/event-stream" };

const sendMessage = (text = "Hello") => {
  cy.get('[data-cy="chat-input"]').type(text);
  cy.get('[data-cy="send-btn"]').click();
};

describe("Chat loading and error states", () => {
  beforeEach(() => {
    cy.visit("/chat");
  });

  it("shows a loading indicator and disables the send button while waiting", () => {
    cy.intercept("POST", CHAT_ENDPOINT, {
      delay: 1500,
      headers: sseHeaders,
      body: sseBody("Hi ", "there!"),
    }).as("chat");

    sendMessage();

    // Feedback must be immediate — not only once the reply lands.
    cy.get('[data-cy="typing-indicator"]').should("be.visible");
    cy.get('[data-cy="send-spinner"]').should("exist");
    cy.get('[data-cy="send-btn"]').should("be.disabled");

    cy.wait("@chat");

    // ...and the UI returns to normal once the response arrives.
    cy.get('[data-cy="assistant-message"]').should("contain.text", "Hi there!");
    cy.get('[data-cy="typing-indicator"]').should("not.exist");
    cy.get('[data-cy="send-spinner"]').should("not.exist");
    cy.get('[data-cy="chat-error"]').should("not.exist");
  });

  it("keeps the user's own message visible while the reply streams", () => {
    cy.intercept("POST", CHAT_ENDPOINT, {
      delay: 800,
      headers: sseHeaders,
      body: sseBody("Sure."),
    }).as("chat");

    sendMessage("What can you do?");

    cy.get('[data-cy="user-message"]').should("contain.text", "What can you do?");
    cy.get('[data-cy="chat-input"]').should("have.value", "");
    cy.wait("@chat");
  });

  it("surfaces an error and re-enables sending when the request fails", () => {
    cy.intercept("POST", CHAT_ENDPOINT, {
      statusCode: 500,
      body: { detail: "provider unavailable" },
    }).as("chat");

    sendMessage();
    cy.wait("@chat");

    cy.get('[data-cy="chat-error"]').should("be.visible").and("contain.text", "500");
    // The empty placeholder bubble must be cleared, not left hanging.
    cy.get('[data-cy="assistant-message"]').should("not.exist");
    cy.get('[data-cy="typing-indicator"]').should("not.exist");

    cy.get('[data-cy="chat-input"]').type("retry");
    cy.get('[data-cy="send-btn"]').should("not.be.disabled");
  });

  it("times out instead of hanging forever when the backend never responds", () => {
    // The core of issue #20: the backend accepts the request but never replies.
    // A static stub with a delay well past the 30s timeout models that; a
    // promise-returning handler cannot, because Cypress caps those at
    // `defaultCommandTimeout`.
    cy.intercept("POST", CHAT_ENDPOINT, {
      delay: 60_000,
      headers: sseHeaders,
      body: sseBody("too late"),
    }).as("chat");

    sendMessage();
    cy.get('[data-cy="typing-indicator"]').should("be.visible");

    // Real-time wait: streamChat's 30s inactivity timeout is not stubbed here,
    // because faking timers also freezes React's scheduler.
    cy.get('[data-cy="chat-error"]', { timeout: 40_000 })
      .should("be.visible")
      .and("contain.text", "No response");

    cy.get('[data-cy="typing-indicator"]').should("not.exist");
    cy.get('[data-cy="send-spinner"]').should("not.exist");
    cy.get('[data-cy="chat-input"]').type("again");
    cy.get('[data-cy="send-btn"]').should("not.be.disabled");
  });
});
