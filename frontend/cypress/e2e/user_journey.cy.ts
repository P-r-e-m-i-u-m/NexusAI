describe("NexusAI User Journey", () => {
  const email = `test_${Date.now()}@nexusai.com`;
  const password = "TestPass123!";

  before(() => {
    cy.visit("/");
  });

  it("registers a new user", () => {
    cy.visit("/register");
    cy.get('[data-cy="email"]').type(email);
    cy.get('[data-cy="username"]').type("testuser");
    cy.get('[data-cy="password"]').type(password);
    cy.get('[data-cy="register-btn"]').click();
    cy.url().should("include", "/login");
  });

  it("logs in successfully", () => {
    cy.login(email, password);
    cy.url().should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Dashboard").should("be.visible");
  });

  it("creates a workflow", () => {
    cy.login(email, password);
    cy.visit("/workflows");
    cy.get('[data-cy="new-workflow-btn"]').click();
    cy.get('[data-cy="workflow-name"]').clear().type("My Test Workflow");
    cy.get('[data-cy="save-workflow-btn"]').click();
    cy.contains("Workflow saved").should("be.visible");
  });

  it("creates an agent and runs it", () => {
    cy.login(email, password);
    cy.visit("/agents");
    cy.get('[data-cy="new-agent-btn"]').click();
    cy.get('[data-cy="agent-name"]').type("Test Agent");
    cy.get('[data-cy="agent-role"]').type("Researcher");
    cy.get('[data-cy="agent-goal"]').type("Research AI trends");
    cy.get('[data-cy="agent-backstory"]').type("Expert AI researcher");
    cy.get('[data-cy="create-agent-btn"]').click();
    cy.contains("Agent created").should("be.visible");
  });

  it("chats with LLM", () => {
    cy.login(email, password);
    cy.visit("/chat");
    cy.get('[data-cy="chat-input"]').type("Hello, what can you do?");
    cy.get('[data-cy="send-btn"]').click();
    cy.get('[data-cy="assistant-message"]', { timeout: 15000 }).should("be.visible");
  });

  it("uploads a document to RAG", () => {
    cy.login(email, password);
    cy.visit("/rag");
    cy.get('[data-cy="kb-name"]').type("Test Knowledge Base");
    cy.get('[data-cy="create-kb-btn"]').click();
    cy.contains("Knowledge base created").should("be.visible");

    const content = "NexusAI is a powerful AI platform built for enterprises.";
    cy.get('[data-cy="file-upload"]').selectFile(
      { contents: Cypress.Buffer.from(content), fileName: "test.txt", mimeType: "text/plain" },
      { force: true }
    );
    cy.contains("indexed", { timeout: 10000 }).should("be.visible");
  });

  it("queries the knowledge base", () => {
    cy.login(email, password);
    cy.visit("/rag");
    cy.get('[data-cy="question-input"]').type("What is NexusAI?");
    cy.get('[data-cy="ask-btn"]').click();
    cy.get('[data-cy="answer"]', { timeout: 15000 }).should("be.visible");
  });
});
