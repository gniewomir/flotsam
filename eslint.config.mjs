import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        // Options/settings pages are plain JS loaded by HTML and run in a browser-like
        // environment (DOM + `chrome` extension APIs).
        files: ["src/**/*.js"],
        languageOptions: {
            globals: {
                document: "readonly",
                window: "readonly",
                URL: "readonly",
                chrome: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
            },
        },
    },
    {
        files: ["test/**/*.ts"],
        languageOptions: {
            globals: {
                node: true,
            },
        },
    },
    {
        ignores: ["dist/", "node_modules/", "scripts/"],
    },
);
