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
        files: ["src/**/*.ts"],
        languageOptions: {
            globals: {
                chrome: "readonly",
                console: "readonly",
            },
        },
    },
    {
        files: ["src/options/*.ts"],
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
        files: ["**/*.ts", "**/*.mjs", "**/*.cjs"],
        rules: {
            "max-len": [
                "error",
                {
                    code: 100,
                    tabWidth: 4,
                    ignoreComments: true,
                    ignoreUrls: true,
                    ignorePattern: "^\\s*(import\\s|export\\s)",
                },
            ],
        },
    },
    {
        ignores: ["dist/", "node_modules/", "scripts/"],
    },
);
