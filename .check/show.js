// .check/show.js - GIVEN. Draws one component and prints the words it shows.   npm run badge   npm run footer
import { load, draw, words } from "./render.js";

const file = process.argv[2];

try
{
  const made = await load(file);
  if (typeof made.default !== "function")
  {
    console.log(file + " no longer hands out its component: keep the line that begins  export default function");
    process.exit(1);
  }
  console.log("The page shows:  " + words(draw(made.default)));
}
catch (e)
{
  console.log("This file cannot be read as it stands.");
  console.log(e.message);
  process.exit(1);
}
