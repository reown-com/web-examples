import React from "react";

function DisplayPlayerScore({
  icon,
  label,
  score,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center flex-col justify-center">
      <div className="flex items-center">
        <div
          className={`w-20 h-20 ${color} flex items-center justify-center transform rotate-30`}
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-center mt-2">
        <p className="text-gray-700 font-semibold text-center">{label}:</p>
        <span className="text-gray-900 font-bold text-lg sm:text-xl ml-2 text-center">
          {score}
        </span>
      </div>
    </div>
  );
}

export default DisplayPlayerScore;
