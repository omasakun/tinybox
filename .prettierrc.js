/** @type {import("prettier").Config} */
export default {
  printWidth: 120,

  plugins: [
    "prettier-plugin-astro",
    "prettier-plugin-tailwindcss", // Must be last for proper class sorting
  ],

  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
