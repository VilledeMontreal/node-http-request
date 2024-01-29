// ==========================================
// We use the ".js" variation of the ESLint config file because
// it allows to specify the "tsconfigRootDir" config using "__dirname"
// and this is required for the generator to format a generated project.
// ==========================================

module.exports = {
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "parserOptions": {
    "project": ["./tsconfig.json"],
    "tsconfigRootDir": __dirname,
    "es6": true
  },
  "env": {
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-ternary": "off",
    "@typescript-eslint/restrict-template-expressions": ["off", { "allowAny": true }],
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/no-unnecessary-type-assertion": "off",
    "@typescript-eslint/restrict-plus-operands" : "off",
    "@typescript-eslint/ban-types": [
      "off",
      {
        "types": {
          "{}": true
        },
        "extendDefaults": true
      }
    ]
  }
}
