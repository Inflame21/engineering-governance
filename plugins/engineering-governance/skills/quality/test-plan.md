# Type: test-plan

A test plan for the repository, following the testing standard's risk-based strategy (`${CLAUDE_PLUGIN_ROOT}/standards/08-testing-quality-engineering-standard.md`). It maps what is tested, what is not, and what to test first. **You do not run tests, coverage tools or the project's scripts**, so you cannot report coverage numbers, pass rates or flaky tests, and you must not.

## Extra rules for this type

- "Tested" means you found a test file that exercises the module and read what it asserts. A test file that exists but asserts little is `Partly tested`; say why. No test found is `No test found`, which is not the same as untested behavior: say where you looked.
- Never state or estimate a coverage percentage.
- Priorities are **proposals** from risk you can show in the code (money, auth, data writes, external calls, complex branching, recent churn from `git log`), each with the reason.
- Do not write test code into the repository. Describe cases in words.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json` and read the layout, the test folders and configuration, CI test steps, and the standard's sections on the test pyramid, negative and failure testing, regression and CI gates. List the modules or features you will map, each with its source folder and its test folder. Tell the user this reads a lot of code, and **wait for a yes**. Let them remove modules.
2. **Write `test-plan.md`** to `<repository>/.governance/test-plans/<YYYY-MM-DD>/` with these sections:
   - **How testing works today**: frameworks, folders, naming, test kinds present (unit, integration, contract, end-to-end, frontend, database), what CI runs and what gates it enforces, each cited.
   - **Map**: a table of module, risk (from what the code shows), tests found (cited), what they assert, status (`Tested`, `Partly tested`, `No test found`) and the gap.
   - **Highest-risk gaps**: the proposed order to close them, each with the reason and the cases to write (inputs, expected outcome, failure and boundary cases), in words.
   - **Test quality issues seen**: skipped or disabled tests, empty or tautological assertions, heavy mocking of the thing under test, hidden order dependence, sleeps and time or randomness without control, tests that need a network or shared state. Cite each.
   - **Missing kinds**: failure, negative, regression or contract tests the standard expects that you found none of.
   - **CI gaps**: what the pipeline does not run or does not fail on, from the CI files.
   - **Not measured**: coverage, runtime, flakiness and pass rate, and how to measure each (the command, from the scripts you read, for a person to run).
3. Write `index.md` and give the final message, as the rules say. Tell the user nothing was executed, that "no test found" depends on where you looked, and that priorities are proposals.
