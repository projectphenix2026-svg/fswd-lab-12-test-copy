// src/Card.jsx - GIVEN, finished. One service, as a card.
export default function Card(props)
{
  const one = props.service;
  return (
    <div className="card">
      <h2>{one.name}</h2>
      <p className="place">{one.place}</p>
      <p className="hours">{one.opens} to {one.closes}</p>
      <p className="note">{one.note}</p>
    </div>
  );
}
