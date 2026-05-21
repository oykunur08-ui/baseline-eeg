import Nav          from "../components/navigation/Nav";
import Hero         from "../components/sections/Hero";
import Problem      from "../components/sections/Problem";
import Theory       from "../components/sections/Theory";
import Experiments  from "../components/sections/Experiments";
import DemoPanel    from "../components/demo/DemoPanel";
import ResearchNotes from "../components/sections/ResearchNotes";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <Theory />
      <Experiments />
      <DemoPanel />
      <ResearchNotes />
    </main>
  );
}
