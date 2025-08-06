// Global TypeScript declarations
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

// Add global types as needed
interface Window {
  // Add any global window properties here
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    // Add other environment variables here
  }
}
