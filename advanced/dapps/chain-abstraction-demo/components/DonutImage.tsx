import Image from "next/image";

export const DonutImage = () => (
  <div className="flex items-center justify-center h-64 relative">
    <Image
      src="/donut-cover.png"
      alt="Gift Donut"
      className="object-cover"
      fill={true}
    />
  </div>
);
