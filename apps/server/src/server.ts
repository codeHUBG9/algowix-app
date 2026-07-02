import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`AlgoWix Platform API listening on http://localhost:${env.PORT}`);
});
