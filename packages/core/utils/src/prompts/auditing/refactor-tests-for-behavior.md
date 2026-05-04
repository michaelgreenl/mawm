# Plan: Making a Test Suite That Tests Behavior

The goal is to produce a suite where **a passing test means the feature works**, and **a failing test means something the user or system depends on is broken** — not that an internal detail changed. Here's the full plan an agent should follow.

---

## Phase 1 — Audit & Inventory the Existing Suite

Before touching anything, the agent needs a complete picture of what exists and what it's actually testing.

### 1.1 — Map Every Test to What It Asserts On

Go through each test file and classify **what the assertion target is**:

| Assertion Target                                      | Classification         | Action           |
| ----------------------------------------------------- | ---------------------- | ---------------- |
| Return value, output, side effect visible to a caller | ✅ Behavior            | Keep             |
| An internal function was called                       | ⚠️ Implementation      | Flag for rewrite |
| A specific private method ran N times                 | ⚠️ Implementation      | Flag for rewrite |
| Internal state of an object/module                    | ⚠️ Implementation      | Flag for rewrite |
| A mock was called with specific args                  | ⚠️ Depends — see below | Evaluate         |

### 1.2 — Map Every Mock to What It's Replacing

For every mock, stub, spy, or fake in the suite, document:

-   **What it replaces** (a DB call, a network request, a file read, a third-party SDK, an internal helper)
-   **Why it was mocked** (slow, stateful, external, or just because?)
-   **Whether the real thing can be used instead**

This surfaces the mocks that are load-bearing (replacing genuinely external infrastructure) versus the ones that are just shortcuts that erode confidence.

### 1.3 — Identify the Public Surface of the Project

List every entry point that a caller, user, or system actually interacts with:

-   Exported functions / classes / modules
-   API routes / controllers
-   CLI commands
-   Event emitters / message handlers
-   Scheduled jobs

This becomes the canonical list of **what must be covered by behavior tests**. If a behavior isn't reachable from this surface, it should either not be tested directly or be promoted to the surface.

---

## Phase 2 — Define the Behaviors That Must Be Verified

The agent must derive a **behavior inventory** from the public surface, not from the implementation.

### 2.1 — Write Behavior Statements First, Before Looking at Tests

For each entry point, write plain-language statements in the form:

> _"Given [starting condition], when [action is taken], then [observable outcome]."_

These become the source of truth for what tests need to exist. Example:

> _Given a valid user record exists, when `createSession(userId)` is called, then a session token is returned and the session is retrievable by that token._

### 2.2 — Group Behaviors by Criticality

-   **Core behaviors** — the project doesn't work without these. Must have full coverage.
-   **Edge case behaviors** — error states, boundary inputs, failure modes. Must be covered.
-   **Incidental behaviors** — internal coordination, logging, ordering of internal steps. Should have little to no coverage.

The agent should only write tests for the first two groups.

---

## Phase 3 — Classify and Triage the Existing Tests

Now map the existing tests against the behavior inventory.

### 3.1 — Assign Each Existing Test One of Four Outcomes

| Outcome                  | Criteria                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Keep as-is**           | Test already asserts a behavior from the inventory using real or realistic inputs        |
| **Refactor**             | Test covers a valid behavior but asserts on internals or uses unnecessary mocks          |
| **Delete**               | Test only verifies implementation detail with no corresponding behavior in the inventory |
| **Gap — needs new test** | A behavior from the inventory has no corresponding test                                  |

### 3.2 — Flag All Tests That Will Give a False Green

These are the most dangerous. A test that passes even when the feature is broken because:

-   The mock returns a hardcoded value that the real dependency never would
-   The assertion is on a spy call count, not an actual outcome
-   The test is testing the mock library, not the code

These must be either rewritten or deleted.

---

## Phase 4 — Establish the Mock Boundary

This is the most important architectural decision. The agent needs to draw a clear line between **what gets mocked** and **what must be real**.

### 4.1 — The Rule: Only Mock What You Don't Own and Can't Control in Tests

Mock only these:

-   **True external third-party services** — payment processors, email providers, external APIs that have no test mode
-   **Hardware or OS-level interfaces** — clocks, randomness (only when determinism is required), file system (only in unit tests that are explicitly testing transformation logic, not I/O behavior)
-   **Infrastructure you can't run locally** — only if a local equivalent (Docker, in-memory, test instance) doesn't exist

Do **not** mock:

-   Your own modules, services, or helpers
-   Databases — use a real test database or an in-memory equivalent (SQLite, `mongomemoryserver`, etc.)
-   HTTP layers internal to the project — test through them, not around them
-   Your own event system, queue, or pub/sub if you can run it locally

### 4.2 — Replace Bad Mocks With Appropriate Test Infrastructure

| Bad Mock | Replace With |
| --- | --- |
| Mocked DB call | Real DB with test data seeded per-test |
| Mocked internal service | Call the real service in the test |
| Mocked HTTP client calling your own API | Start the server and make real HTTP calls |
| Mocked file system | Use a temp directory |
| Mocked external API | A contract test or a local mock server (e.g., WireMock, `nock` with recorded responses) |

---

## Phase 5 — Rewrite Integration Tests to Test End-to-End Behaviors

Integration tests are the highest-value tests in this system. They should be the backbone.

### 5.1 — Integration Test Structure

Each integration test should:

1. **Set up real state** — seed the database, configure the environment, start dependent services
2. **Invoke the system at its public entry point** — the route, the exported function, the CLI command
3. **Assert on the observable outcome** — what came back, what changed in the database, what was emitted
4. **Tear down state** — clean up only what was created, never share state between tests

### 5.2 — Integration Tests Must Cover

-   The happy path for every core behavior
-   Every distinct error condition that results in a different outcome for the caller
-   Boundary conditions at the entry point (empty input, max input, invalid types)
-   State transitions — if the system has state, test that it moves correctly from A → B → C

### 5.3 — Integration Tests Must Never

-   Assert that a specific internal function was called
-   Be ordered — each test must be fully independent
-   Rely on state left by another test

---

## Phase 6 — Constrain Unit Tests to Pure Logic Only

Unit tests still have a role, but a narrow one. After integration tests cover behavior, unit tests cover the things that are hard to exercise through the integration layer.

### 6.1 — Valid Targets for Unit Tests

-   **Pure transformation functions** — parsing, formatting, calculation, validation logic
-   **Complex branching logic** — many input combinations that would be expensive to set up at the integration level
-   **Error handling within a function** — where the error is a result of logic, not infrastructure

### 6.2 — Unit Tests Must Operate Without Mocks When Possible

If a function requires mocking to unit test, that's usually a signal that:

-   The function is doing too much and should be split
-   The logic should be extracted into a pure function that can be tested in isolation
-   The test should be an integration test instead

### 6.3 — The Unit Test Must Still Assert on Output, Not Process

Even for unit tests, the assertion must be:

> _"Given this input, I get this output"_

Not:

> _"This internal helper was invoked during execution"_

---

## Phase 7 — Establish Coverage Rules the Agent Can Enforce Going Forward

### 7.1 — Coverage Targets by Layer

| Layer                                   | Target | Measured By                                       |
| --------------------------------------- | ------ | ------------------------------------------------- |
| Integration — core behavior happy paths | 100%   | Every behavior statement from Phase 2 has a test  |
| Integration — error/edge cases          | 100%   | Every distinct failure mode has a test            |
| Unit — pure logic functions             | High   | Branch/statement coverage on transformation logic |
| Implementation details                  | 0%     | No tests assert on internals                      |

### 7.2 — The Durability Checklist

Before any test is committed, run it through this checklist:

-   [ ] The test asserts on something a caller or user would observe
-   [ ] The test would fail if the feature broke, even if the internals changed
-   [ ] The test does not assert on which internal functions ran
-   [ ] Every mock in the test replaces something that cannot be run locally
-   [ ] The test is independent — it passes and fails in isolation
-   [ ] The test setup uses real state, not hardcoded return values

### 7.3 — The Regression Signal Test

For each core behavior test, the agent should verify the test is actually load-bearing by **temporarily breaking the feature** (comment out the implementation, return null, throw an error) and confirming the test fails. If it still passes, the test is not testing what it claims to be.

---

## Execution Order for the Agent

1. Run Phase 1 — produce the audit document (inventory of tests + mocks)
2. Run Phase 2 — produce the behavior inventory from the public surface
3. Run Phase 3 — triage every existing test against the behavior inventory
4. Run Phase 4 — establish the mock boundary, identify what infrastructure is needed
5. Set up test infrastructure (test DB, local servers, etc.) before touching tests
6. Delete all tests classified as "Delete" in Phase 3
7. Rewrite all tests classified as "Refactor" in Phase 3
8. Write new tests for all gaps identified in Phase 3
9. Run Phase 7.3 regression signal check on every core behavior test
10. Lock the Phase 7.2 checklist into code review / CI requirements

---

The core principle the agent should apply at every decision point: **if this test passing doesn't mean the feature works, the test shouldn't exist.**

---

IMPORTANT NOTE: Any plans/audits can be written to this `../test-suite-refactor/` directory
