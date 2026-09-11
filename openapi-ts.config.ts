import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "http://localhost:8000/openapi.json",
  output: "generated",
  plugins: [
    {
      name: "@hey-api/typescript",
      enums: "typescript",
    }
  ]
});
