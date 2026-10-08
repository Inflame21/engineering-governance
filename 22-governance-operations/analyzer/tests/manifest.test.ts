import { describe, expect, it } from "vitest";
import { hasPackageDependency, hasPythonDependency, parsePackageJson } from "../src/manifest.js";

describe("manifest inspection", () => {
  it("detects JavaScript dependencies from package.json", () => {
    const packageJson = parsePackageJson(JSON.stringify({
      dependencies: { react: "^19.0.0" },
      devDependencies: { vite: "^7.0.0" },
    }));

    expect(hasPackageDependency(packageJson, "react")).toBe(true);
    expect(hasPackageDependency(packageJson, "next")).toBe(false);
    expect(hasPackageDependency(packageJson, "vite")).toBe(true);
  });

  it("does not confuse similarly named Python packages", () => {
    expect(hasPythonDependency("fastapi==0.115.0\npydantic==2.0.0\n", "fastapi")).toBe(true);
    expect(hasPythonDependency("fastapi-users==13.0.0\n", "fastapi")).toBe(false);
  });
});
