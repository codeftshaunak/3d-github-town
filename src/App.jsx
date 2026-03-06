import React from "react";
import { GitHubProvider } from "./context/GitHubContext";
import GitHubTown from "./components/GitHubTown";

function App() {
  return (
    <GitHubProvider>
      <div className="w-full h-screen">
        <GitHubTown />
      </div>
    </GitHubProvider>
  );
}

export default App;
