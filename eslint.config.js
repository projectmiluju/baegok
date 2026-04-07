import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".next/",
      "apps/web/.next/",
      "apps/web/node_modules/",
      "apps/api/node_modules/",
      "apps/mcp/node_modules/",
    ],
  },
];
