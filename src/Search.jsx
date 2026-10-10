// src/Search.jsx - GIVEN, finished. The search box of release 1.1.0.
// It is drawn only when SEARCH is true in src/features.js: that one word switches the feature on.
export default function Search(props)
{
  return (
    <p className="search">
      <input
        type="text"
        value={props.words}
        placeholder="Search for a service"
        aria-label="Search for a service"
        onChange={(event) => props.onType(event.target.value)}
      />
    </p>
  );
}
