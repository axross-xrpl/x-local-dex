import typescriptLogo from "/typescript.svg";

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex items-center space-x-8 mb-12">
        <a 
          href="https://vitejs.dev" 
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img 
            src="/vite.svg" 
            className="h-24 w-24 hover:drop-shadow-lg" 
            alt="Vite logo" 
          />
        </a>
        <a 
          href="https://www.typescriptlang.org/" 
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img
            src={typescriptLogo}
            className="h-24 w-24 hover:drop-shadow-lg"
            alt="TypeScript logo"
          />
        </a>
      </div>
      
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Welcome to Frontend App
        </h1>
        <p className="text-lg text-gray-700 mb-4">
          This is a Vite + React + TypeScript project with Tailwind CSS, set up in a monorepo structure using Turborepo.
        </p>
        <p className="text-gray-600">
          Edit <code className="bg-gray-200 px-1 rounded">apps/frontend/src/pages/HomePage.tsx</code> to get started.
        </p>
      </div>
    </div>
  );
};

export default HomePage;