import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import OnboardingFlow from "./components/OnboardingFlow";
import Library from "./pages/Library";
import QA from "./pages/QA";
import NewProject from "./pages/NewProject";
import { hasOnboarded } from "./lib/onboarding";

export default function App() {
  const [ready, setReady] = useState(hasOnboarded());

  if (!ready) {
    return <OnboardingFlow onComplete={() => setReady(true)} />;
  }

  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/ask" element={<QA />} />
          <Route path="/new-project" element={<NewProject />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
