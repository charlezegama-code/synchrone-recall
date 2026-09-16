import { BrowserRouter, Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import Library from "./pages/Library";
import QA from "./pages/QA";
import NewProject from "./pages/NewProject";

export default function App() {
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
