import { createEntityClient } from "../utils/entityWrapper";
import schema from "./BattleshipGame.json";
export const BattleshipGame = createEntityClient("BattleshipGame", schema);
