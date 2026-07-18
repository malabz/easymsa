import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { LanguageProvider } from "./lib/i18n/LanguageProvider";
import { queryClient } from "./lib/query/queryClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
