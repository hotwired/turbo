module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: ["eslint:recommended"],
  overrides: [
    {
      env: {
        node: true
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script"
      }
    }
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {
    "comma-dangle": "error",
    "curly": ["error", "multi-line"],
    "getter-return": "off",
    "no-console": "off",
    "no-duplicate-imports": ["error"],
    "no-multi-spaces": ["error", { "exceptions": { "VariableDeclarator": true }}],
    "no-multiple-empty-lines": ["error", { "max": 2 }],
    "no-self-assign": ["error", { "props": false }],
    "no-trailing-spaces": ["error"],
    "no-unused-vars": ["error", { argsIgnorePattern: "_*" , "ignoreRestSiblings": true}],
    "no-useless-escape": "off",
    "no-var": ["error"],
    "prefer-const": ["error"],
    "semi": ["error", "never"]
  },
  globals: {
    test: true,
    setup: true
  }
}
