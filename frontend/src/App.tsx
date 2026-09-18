import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Shell from "./components/Shell";
import OnboardingFlow from "./components/OnboardingFlow";
import Library from "./pages/Library";
import QA from "./pages/QA";
import NewProject from "./pages/NewProject";
import Record from "./pages/Record";
import { ConversationsProvider } from "./lib/conversations";

function Welcome() {
  const navigate = useNavigate();
  return <OnboardingFlow onComplete={() => navigate("/")} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ConversationsProvider>
        <Routes>
          {/* Intro tour is reachable but no longer gates the app (no persisted state). */}
          <Route path="/welcome" element={<Welcome />} />
          <Route
            path="*"
            element={
              <Shell>
                <Routes>
                  <Route path="/" element={<Library />} />
                  <Route path="/ask" element={<QA />} />
                  <Route path="/new-project" element={<NewProject />} />
                  <Route path="/record" element={<Record />} />
                </Routes>
              </Shell>
            }
          />
        </Routes>
      </ConversationsProvider>
    </BrowserRouter>
  );
}
