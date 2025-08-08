import { createEntityClient } from "../utils/entityWrapper";
import schema from "./BattleshipPlayer.json";
export const BattleshipPlayer = createEntityClient("BattleshipPlayer", schema);
