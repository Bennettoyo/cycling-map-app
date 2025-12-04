import Map from "./components/Map";

function App() {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1
        className="
  text-4xl
  font-extrabold
  tracking-tight
  bg-gradient-to-r
  from-red-600
  via-rose-500
  to-orange-400
  bg-clip-text
  text-transparent
  pb-3
"
      >
        Cycle Route Planner
      </h1>

      <Map />
    </div>
  );
}

export default App;
