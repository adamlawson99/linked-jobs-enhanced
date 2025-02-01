import "../global.css";
import OptionsLink from "./settingsButton";

export const Popup = () => {
  return (
    <div className="text-xl font-bold text-gray-800 grid justify-center align-center bg-gray-50">
      <h1 className="font-bold mb-5">LinkedIn Jobs Enhanced</h1>
      <OptionsLink />
    </div>
  );
};
