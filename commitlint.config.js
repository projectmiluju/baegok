export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "build",
        "chore",
        "ci",
        "docs",
        "style",
        "refactor",
        "test",
        "release",
        "revert",
        "perf",
      ],
    ],
    "subject-empty": [2, "never"],
    "type-empty": [2, "never"],
    "subject-case": [0],
  },
};
