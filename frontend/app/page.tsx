import Nav           from "../components/navigation/Nav";
import Hero          from "../components/sections/Hero";
import Problem       from "../components/sections/Problem";
import Theory        from "../components/sections/Theory";
import Experiments   from "../components/sections/Experiments";
import ResearchLab   from "../components/sections/ResearchLab";
import About         from "../components/sections/About";
import ResearchPaper from "../components/sections/ResearchPaper";
import ResearchNotes from "../components/sections/ResearchNotes";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <Theory />
      <Experiments />
      <ResearchLab />
      <About />
      <ResearchPaper />
      <ResearchNotes />
    </main>
  );
}
