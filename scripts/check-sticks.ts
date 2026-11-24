import db from "../src/lib/db";
const rows = db
  .prepare(
    `SELECT item_code, tally_name, sticks_per_pack FROM items WHERE tally_name IN ('FUSE','LIGHTS','RED','ADVANCE') ORDER BY tally_name, item_code`
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
