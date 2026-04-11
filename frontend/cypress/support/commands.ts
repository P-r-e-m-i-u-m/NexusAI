declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): void;
    createWorkflow(name: string, definition?: object): Chainable<string>;
    uploadDocument(filename: string, content: string): void;
    waitForProcessing(resourceId: string, timeout?: number): void;
  }
}

Cypress.Commands.add("login", (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit("/login");
    cy.get('[data-cy="email"]').type(email);
    cy.get('[data-cy="password"]').type(password);
    cy.get('[data-cy="login-btn"]').click();
    cy.url().should("not.include", "/login");
  });
});

Cypress.Commands.add("createWorkflow", (name: string, definition = {}) => {
  return cy.request({
    method: "POST",
    url: "/api/v1/workflows/",
    body: { name, graph: definition },
    headers: { Authorization: `Bearer ${localStorage.getItem("nexusai_token")}` },
  }).then((resp) => resp.body.id);
});

Cypress.Commands.add("uploadDocument", (filename: string, content: string) => {
  cy.get('[data-cy="file-upload"]').selectFile(
    { contents: Cypress.Buffer.from(content), fileName: filename, mimeType: "text/plain" },
    { force: true }
  );
});

Cypress.Commands.add("waitForProcessing", (resourceId: string, timeout = 30000) => {
  const start = Date.now();
  const checkStatus = () => {
    cy.request(`/api/v1/rag/kb/${resourceId}/documents`).then((resp) => {
      const allDone = resp.body.every((d: any) => d.status === "indexed");
      if (!allDone && Date.now() - start < timeout) {
        cy.wait(1000).then(checkStatus);
      }
    });
  };
  checkStatus();
});
