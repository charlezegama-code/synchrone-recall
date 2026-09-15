import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Library from "./pages/Library";
import QA from "./pages/QA";
import NewProject from "./pages/NewProject";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-alabaster">
        <Header />
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/qa" element={<QA />} />
          <Route path="/new-project" element={<NewProject />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
