import BloodDrop from "./BloodDrop";
import { HERO_DROPS } from "../data";

/** Blood drops falling the full height of the hero, each on its own phase. */
function HeroDrops() {
  return (
    <div className="ll-drops" aria-hidden="true">
      {HERO_DROPS.map((drop, i) => (
        <div
          key={i}
          className="ll-drop"
          style={{
            left: drop.left,
            animationDelay: drop.delay,
            animationDuration: drop.duration,
          }}
        >
          <BloodDrop size={drop.size} />
        </div>
      ))}
    </div>
  );
}

export default HeroDrops;
