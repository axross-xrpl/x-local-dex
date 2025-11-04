import { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {

  // UI Component Generator
  plop.setGenerator("component", {
    description: "Create a new React component with TypeScript",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the component name?",
        validate: (input: string) => {
          if (!input) {
            return "Component name is required";
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
            return "Component name must be PascalCase and start with a capital letter";
          }
          return true;
        },
      },
    ],
    actions: () => {
      const actions: PlopTypes.ActionType[] = [
        {
          type: "add",
          path: "{{ turbo.paths.root }}/packages/ui/components/{{ kebabCase name }}.tsx",
          templateFile: "templates/component.hbs",
        },
        {
          type: "append",
          path: "{{ turbo.paths.root }}/packages/ui/components/index.ts",
          pattern: /$/,
          template: "export * from \"./{{ kebabCase name }}\";",
        },
        {
          type: "modify",
          path: "{{ turbo.paths.root }}/packages/ui/package.json",
          pattern: /(    "\.\/setup-counter": "\.\/utils\/counter\.ts")/,
          template: `$1,
    "./{{ kebabCase name }}": "./components/{{ kebabCase name }}.ts"`,
        },
      ];

      return actions;
    },
  });

  // Utility function generator
  plop.setGenerator("util", {
    description: "Create a new utility function with TypeScript",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the utility name?",
        validate: (input: string) => {
          if (!input) {
            return "Utility name is required";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "What does this utility do?",
        default: "",
      },
    ],
    actions: () => {
      const actions: PlopTypes.ActionType[] = [
        {
          type: "add",
          path: "{{ turbo.paths.root }}/packages/utils/src/{{ kebabCase name }}.ts",
          templateFile: "templates/util.hbs",
        },
        {
          type: "append",
          path: "{{ turbo.paths.root }}/packages/utils/src/index.ts",
          pattern: /$/,
          template: "export * from './{{ kebabCase name }}';",
        },
      ];

      return actions;
    },
  });
}