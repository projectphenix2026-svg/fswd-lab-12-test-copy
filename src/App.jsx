// src/App.jsx - GIVEN, finished. The dashboard: it loads the services, and draws one card for each.
import { useEffect, useState } from "react";
import Card from "./Card.jsx";
import Search from "./Search.jsx";
import Footer from "./Footer.jsx";
import { SEARCH } from "./features.js";
import "./App.css";

export default function App()
{
  const [services, setServices] = useState([]);
  const [words, setWords] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() =>
  {
    async function load()
    {
      const reply = await fetch("services.json");
      if (!reply.ok)
      {
        setProblem("Could not load the services.");
        return;
      }
      setServices(await reply.json());
    }
    load();
  }, []);

  // the services whose name holds the words typed into the search box (all of them, while the box is empty)
  const shown = services.filter((one) => one.name.toLowerCase().includes(words.toLowerCase()));

  return (
    <div className="page">
      <h1>Student Services Dashboard</h1>
      <p className="lead">Where each service is, and when it is open.</p>
      {SEARCH && <Search words={words} onType={setWords} />}
      {problem && <p className="problem">{problem}</p>}
      {!problem && <p className="count">Showing {shown.length} of {services.length} services</p>}
      {shown.map((one) => <Card key={one.name} service={one} />)}
      {!problem && services.length > 0 && shown.length === 0 && <p className="none">No service matches</p>}
      <Footer />
    </div>
  );
}
